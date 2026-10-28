(function (ns) {
  const { ErroPlanilha } = ns;

  const ASSINATURA_FIM_DO_ZIP = 0x06054b50;
  const ASSINATURA_ENTRADA_CENTRAL = 0x02014b50;
  const METODO_SEM_COMPRESSAO = 0;
  const METODO_DEFLATE = 8;
  const MENSAGEM_ARQUIVO_INVALIDO = "Não foi possível abrir o arquivo. Envie um .xlsx válido.";

  function localizarFimDoZip(visao) {
    const limite = Math.max(0, visao.byteLength - 65557);
    for (let i = visao.byteLength - 22; i >= limite; i--) {
      if (visao.getUint32(i, true) === ASSINATURA_FIM_DO_ZIP) return i;
    }
    throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);
  }

  function listarEntradas(buffer) {
    const visao = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const decodificador = new TextDecoder();
    const fim = localizarFimDoZip(visao);
    const total = visao.getUint16(fim + 10, true);
    let posicao = visao.getUint32(fim + 16, true);
    const entradas = new Map();

    for (let i = 0; i < total; i++) {
      if (visao.getUint32(posicao, true) !== ASSINATURA_ENTRADA_CENTRAL) {
        throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);
      }
      const tamanhoNome = visao.getUint16(posicao + 28, true);
      const tamanhoExtra = visao.getUint16(posicao + 30, true);
      const tamanhoComentario = visao.getUint16(posicao + 32, true);
      const nome = decodificador.decode(bytes.subarray(posicao + 46, posicao + 46 + tamanhoNome));

      entradas.set(nome, {
        metodo: visao.getUint16(posicao + 10, true),
        tamanhoComprimido: visao.getUint32(posicao + 20, true),
        deslocamento: visao.getUint32(posicao + 42, true),
      });
      posicao += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
    }
    return entradas;
  }

  async function descompactar(buffer, entrada) {
    const visao = new DataView(buffer);
    const inicioLocal = entrada.deslocamento;
    const tamanhoNome = visao.getUint16(inicioLocal + 26, true);
    const tamanhoExtra = visao.getUint16(inicioLocal + 28, true);
    const inicioDados = inicioLocal + 30 + tamanhoNome + tamanhoExtra;
    const dados = new Uint8Array(buffer, inicioDados, entrada.tamanhoComprimido);

    if (entrada.metodo === METODO_SEM_COMPRESSAO) return dados;
    if (entrada.metodo !== METODO_DEFLATE) throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);

    const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  }

  async function lerTexto(buffer, entradas, nome) {
    const entrada = entradas.get(nome);
    if (!entrada) return null;
    return new TextDecoder().decode(await descompactar(buffer, entrada));
  }

  const parseXml = (texto) => new DOMParser().parseFromString(texto, "application/xml");

  function lerTextosCompartilhados(xml) {
    if (!xml) return [];
    return [...parseXml(xml).getElementsByTagName("si")].map((si) =>
      [...si.getElementsByTagName("t")].map((t) => t.textContent).join("")
    );
  }

  function caminhoDaPrimeiraAba(xmlWorkbook, xmlRelacoes) {
    const aba = parseXml(xmlWorkbook).getElementsByTagName("sheet")[0];
    const idRelacao = aba?.getAttribute("r:id");
    const relacao = [...parseXml(xmlRelacoes).getElementsByTagName("Relationship")].find(
      (r) => r.getAttribute("Id") === idRelacao
    );
    if (!relacao) throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);

    const destino = relacao.getAttribute("Target");
    return destino.startsWith("/") ? destino.slice(1) : `xl/${destino}`;
  }

  function indiceDaColuna(referencia) {
    const letras = referencia.match(/^[A-Z]+/)[0];
    return [...letras].reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0) - 1;
  }

  function valorDaCelula(celula, textos) {
    const tipo = celula.getAttribute("t");
    if (tipo === "inlineStr") return celula.textContent;

    const valor = celula.getElementsByTagName("v")[0]?.textContent;
    if (valor === undefined) return null;
    if (tipo === "s") return textos[Number(valor)];
    if (tipo === "b") return valor === "1";
    if (tipo === "str" || tipo === "e") return valor;
    return Number(valor);
  }

  function lerLinhasDaAba(xml, textos) {
    const linhas = [];
    for (const linha of parseXml(xml).getElementsByTagName("row")) {
      const posicao = Number(linha.getAttribute("r")) - 1;
      const valores = [];
      for (const celula of linha.getElementsByTagName("c")) {
        valores[indiceDaColuna(celula.getAttribute("r"))] = valorDaCelula(celula, textos);
      }
      linhas[posicao] = valores;
    }
    return Array.from(linhas, (linha) => linha ?? []);
  }

  async function lerLinhas(buffer) {
    try {
      const entradas = listarEntradas(buffer);
      const workbook = await lerTexto(buffer, entradas, "xl/workbook.xml");
      const relacoes = await lerTexto(buffer, entradas, "xl/_rels/workbook.xml.rels");
      if (!workbook || !relacoes) throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);

      const caminhoAba = caminhoDaPrimeiraAba(workbook, relacoes);
      const textos = lerTextosCompartilhados(await lerTexto(buffer, entradas, "xl/sharedStrings.xml"));
      const xmlAba = await lerTexto(buffer, entradas, caminhoAba);
      if (!xmlAba) throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);

      return lerLinhasDaAba(xmlAba, textos);
    } catch (erro) {
      if (erro instanceof ErroPlanilha) throw erro;
      throw new ErroPlanilha(MENSAGEM_ARQUIVO_INVALIDO);
    }
  }

  ns.LeitorXlsx = { lerLinhas };
})((globalThis.Certificados ??= {}));

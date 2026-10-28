(function (ns) {
  const { ErroPlanilha } = ns;

  const COLUNAS_OBRIGATORIAS = {
    ponto: { exibicao: "Ponto", apelidos: ["ponto", "ponto_de_ensaio", "ponto_ensaio"] },
    padrao: {
      exibicao: "Valor_Padrao",
      apelidos: ["valor_padrao", "padrao", "valor_do_padrao", "valor_de_referencia"],
    },
    lea: {
      exibicao: "LEA",
      apelidos: ["lea", "limite_de_erro_admissivel", "limite_erro_admissivel"],
    },
  };
  const PREFIXO_LEITURA = "leitura";

  const normalizar = (texto) =>
    String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const estaVazio = (valor) =>
    valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === "");

  const linhaEstaVazia = (linha) => Array.from(linha, estaVazio).every(Boolean);

  function paraNumero(valor, contexto) {
    const numero =
      typeof valor === "number" ? valor
      : typeof valor === "string" ? Number(valor.trim().replace(",", "."))
      : NaN;
    if (!Number.isFinite(numero)) {
      throw new ErroPlanilha(`${contexto}: valor não numérico (${valor}).`);
    }
    return numero;
  }

  function mapearCabecalho(cabecalho) {
    const indices = {};
    const colunasLeitura = [];

    Array.from(cabecalho).forEach((titulo, indice) => {
      if (estaVazio(titulo)) return;
      const nome = normalizar(titulo);
      for (const [chave, { apelidos }] of Object.entries(COLUNAS_OBRIGATORIAS)) {
        if (apelidos.includes(nome) && !(chave in indices)) indices[chave] = indice;
      }
      if (nome.startsWith(PREFIXO_LEITURA)) colunasLeitura.push(indice);
    });

    const ausentes = Object.entries(COLUNAS_OBRIGATORIAS)
      .filter(([chave]) => !(chave in indices))
      .map(([, { exibicao }]) => exibicao);
    if (colunasLeitura.length === 0) ausentes.push("Leitura_1 ... Leitura_n");
    if (ausentes.length > 0) {
      throw new ErroPlanilha(`Colunas obrigatórias ausentes no cabeçalho: ${ausentes.join(", ")}.`);
    }
    return { indices, colunasLeitura };
  }

  function lerPonto(linha, numeroLinha, { indices, colunasLeitura }) {
    const nomeCelula = linha[indices.ponto];
    const nome = estaVazio(nomeCelula) ? `Linha ${numeroLinha}` : String(nomeCelula).trim();
    const contexto = `Linha ${numeroLinha} (${nome})`;

    if (estaVazio(linha[indices.padrao])) throw new ErroPlanilha(`${contexto}: Valor_Padrao não informado.`);
    if (estaVazio(linha[indices.lea])) throw new ErroPlanilha(`${contexto}: LEA não informado.`);

    const padrao = paraNumero(linha[indices.padrao], `${contexto}, Valor_Padrao`);
    const lea = paraNumero(linha[indices.lea], `${contexto}, LEA`);
    if (lea < 0) throw new ErroPlanilha(`${contexto}: LEA não pode ser negativo.`);

    const leituras = colunasLeitura
      .filter((i) => !estaVazio(linha[i]))
      .map((i) => paraNumero(linha[i], `${contexto}, coluna ${i + 1}`));
    if (leituras.length === 0) throw new ErroPlanilha(`${contexto}: nenhuma leitura informada.`);

    return { ponto: nome, padrao, lea, leituras };
  }

  function extrairPontos(linhas) {
    if (!linhas || linhas.length === 0) throw new ErroPlanilha("A planilha está vazia.");

    const [cabecalho, ...dados] = linhas;
    const mapa = mapearCabecalho(cabecalho);

    const pontos = dados
      .map((linha, i) => ({ linha, numero: i + 2 }))
      .filter(({ linha }) => !linhaEstaVazia(linha))
      .map(({ linha, numero }) => lerPonto(linha, numero, mapa));

    if (pontos.length === 0) throw new ErroPlanilha("Nenhum ponto de ensaio encontrado na planilha.");
    return pontos;
  }

  ns.LeitorPlanilha = { extrairPontos };
})((globalThis.Certificados ??= {}));

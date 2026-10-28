(function (ns) {
  const { STATUS, PARECER } = ns.Calculos;

  const CASAS_DECIMAIS = 4;
  const LIMITE_VISUAL = 1.5;

  const formatador = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: CASAS_DECIMAIS,
    maximumFractionDigits: CASAS_DECIMAIS,
  });
  const formatar = (valor) => formatador.format(Math.round(valor * 10 ** CASAS_DECIMAIS) / 10 ** CASAS_DECIMAIS || 0);

  const rotuloStatus = (status) => (status === STATUS.DENTRO ? "Dentro da tolerância" : "Fora da tolerância");

  function criar(tag, { classe, texto, atributos = {} } = {}, filhos = []) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    Object.entries(atributos).forEach(([nome, valor]) => elemento.setAttribute(nome, valor));
    elemento.append(...filhos);
    return elemento;
  }

  function posicaoNaFaixa({ erroSistematico, erroAbsoluto, lea }) {
    const razao = lea > 0 ? erroSistematico / lea : Math.sign(erroSistematico) * (erroAbsoluto > 0 ? LIMITE_VISUAL : 0);
    const limitada = Math.max(-LIMITE_VISUAL, Math.min(LIMITE_VISUAL, razao));
    return 50 + (limitada / (2 * LIMITE_VISUAL)) * 100;
  }

  function criarFaixa(ponto) {
    const marca = criar("span", { classe: `faixa__marca faixa__marca--${ponto.status === STATUS.DENTRO ? "ok" : "falha"}` });
    marca.style.left = `${posicaoNaFaixa(ponto)}%`;
    return criar("div", { classe: "faixa", atributos: { "aria-hidden": "true" } }, [
      criar("span", { classe: "faixa__zona" }),
      criar("span", { classe: "faixa__zero" }),
      marca,
    ]);
  }

  function criarLinha(ponto) {
    const dentro = ponto.status === STATUS.DENTRO;
    const celulaNumero = (valor) => criar("td", { classe: "numero", texto: formatar(valor) });

    return criar("tr", { classe: dentro ? "" : "linha-falha" }, [
      criar("th", { texto: ponto.ponto, atributos: { scope: "row" } }),
      celulaNumero(ponto.padrao),
      celulaNumero(ponto.media),
      celulaNumero(ponto.erroSistematico),
      celulaNumero(ponto.lea),
      criar("td", {}, [criarFaixa(ponto)]),
      criar("td", {}, [criar("span", { classe: `selo selo--${dentro ? "ok" : "falha"}`, texto: rotuloStatus(ponto.status) })]),
    ]);
  }

  function criarTabela(pontos) {
    const titulos = ["Ponto", "Padrão", "Média", "Erro sistemático", "LEA", "Erro em relação ao limite", "Status"];
    const cabecalho = criar("thead", {}, [
      criar("tr", {}, titulos.map((t) => criar("th", { texto: t, atributos: { scope: "col" } }))),
    ]);
    const tabela = criar("table", {}, [cabecalho, criar("tbody", {}, pontos.map(criarLinha))]);
    return criar("div", { classe: "tabela-rolagem" }, [tabela]);
  }

  function criarResumo({ total, dentro, fora, maiorErroAbsoluto }) {
    const item = (rotulo, valor) =>
      criar("div", { classe: "resumo__item" }, [criar("dt", { texto: rotulo }), criar("dd", { texto: valor })]);
    return criar("dl", { classe: "resumo" }, [
      item("Pontos de ensaio", String(total)),
      item("Dentro da tolerância", String(dentro)),
      item("Fora da tolerância", String(fora)),
      item("Maior erro absoluto", formatar(maiorErroAbsoluto)),
    ]);
  }

  function criarParecer({ parecer }, nomeArquivo) {
    const aprovado = parecer === PARECER.APROVADO;
    const emitidoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const botaoImprimir = criar("button", { classe: "botao", texto: "Imprimir certificado", atributos: { type: "button" } });
    botaoImprimir.addEventListener("click", () => window.print());

    return criar("div", { classe: `parecer parecer--${aprovado ? "aprovado" : "reprovado"}` }, [
      criar("div", {}, [
        criar("p", { classe: "parecer__rotulo", texto: "Parecer final" }),
        criar("h2", { classe: "parecer__valor", texto: parecer }),
      ]),
      criar("div", { classe: "parecer__meta" }, [
        criar("p", { texto: `Arquivo: ${nomeArquivo}` }),
        criar("p", { texto: `Emitido em ${emitidoEm}` }),
        botaoImprimir,
      ]),
    ]);
  }

  const elemento = (id) => document.getElementById(id);

  function mostrarResultado(resultado, nomeArquivo) {
    esconderAlerta();
    const secao = elemento("resultado");
    secao.replaceChildren(
      criarParecer(resultado, nomeArquivo),
      criarResumo(resultado.resumo),
      criar("h3", { texto: "Resultado por ponto de ensaio" }),
      criarTabela(resultado.pontos),
      criar("p", {
        classe: "nota",
        texto: "Erro sistemático = média das leituras − valor do padrão. O ponto é conforme quando o erro absoluto é menor ou igual ao LEA. Na faixa, a zona destacada é ±LEA e o traço central é erro zero.",
      })
    );
    secao.hidden = false;
  }

  function mostrarErro(mensagem) {
    limparResultado();
    const alerta = elemento("alerta");
    alerta.replaceChildren(criar("strong", { texto: "Não foi possível processar a planilha. " }), mensagem);
    alerta.hidden = false;
  }

  function esconderAlerta() {
    elemento("alerta").hidden = true;
  }

  function limparResultado() {
    elemento("resultado").hidden = true;
    elemento("resultado").replaceChildren();
  }

  ns.Interface = { mostrarResultado, mostrarErro };
})((globalThis.Certificados ??= {}));

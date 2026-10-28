(function (ns) {
  const STATUS = Object.freeze({
    DENTRO: "DENTRO_DA_TOLERANCIA",
    FORA: "FORA_DA_TOLERANCIA",
  });

  const PARECER = Object.freeze({
    APROVADO: "APROVADO",
    REPROVADO: "REPROVADO",
  });

  const EPSILON = 1e-9;

  const media = (valores) => valores.reduce((soma, v) => soma + v, 0) / valores.length;

  const classificar = (erroAbsoluto, lea) =>
    erroAbsoluto <= lea + EPSILON ? STATUS.DENTRO : STATUS.FORA;

  function calcularPonto({ ponto, padrao, lea, leituras }) {
    const mediaLida = media(leituras);
    const erroSistematico = mediaLida - padrao;
    const erroAbsoluto = Math.abs(erroSistematico);

    return {
      ponto,
      padrao,
      lea,
      leituras,
      media: mediaLida,
      erroSistematico,
      erroAbsoluto,
      status: classificar(erroAbsoluto, lea),
    };
  }

  function emitirParecer(pontosCalculados) {
    const todosDentro = pontosCalculados.every((p) => p.status === STATUS.DENTRO);
    return todosDentro ? PARECER.APROVADO : PARECER.REPROVADO;
  }

  function processar(pontos) {
    const calculados = pontos.map(calcularPonto);
    const fora = calculados.filter((p) => p.status === STATUS.FORA).length;

    return {
      pontos: calculados,
      parecer: emitirParecer(calculados),
      resumo: {
        total: calculados.length,
        dentro: calculados.length - fora,
        fora,
        maiorErroAbsoluto: Math.max(...calculados.map((p) => p.erroAbsoluto)),
      },
    };
  }

  ns.Calculos = { STATUS, PARECER, media, calcularPonto, emitirParecer, processar };
})((globalThis.Certificados ??= {}));

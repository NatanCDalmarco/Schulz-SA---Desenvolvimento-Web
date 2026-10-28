(function (ns) {
  const { ErroPlanilha, LeitorXlsx, LeitorPlanilha, Calculos, Interface } = ns;

  const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

  function validarArquivo(arquivo) {
    if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
      throw new ErroPlanilha("Formato inválido: envie um arquivo .xlsx.");
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      throw new ErroPlanilha("O arquivo é maior que 5 MB.");
    }
  }

  async function processarArquivo(arquivo) {
    try {
      validarArquivo(arquivo);
      const linhas = await LeitorXlsx.lerLinhas(await arquivo.arrayBuffer());
      const pontos = LeitorPlanilha.extrairPontos(linhas);
      Interface.mostrarResultado(Calculos.processar(pontos), arquivo.name);
      ns.Emissao.preparar(pontos, arquivo.name);
    } catch (erro) {
      if (!(erro instanceof ErroPlanilha)) throw erro;
      Interface.mostrarErro(erro.message);
      ns.Emissao.esconder();
    }
  }

  function configurarSelecao() {
    const entrada = document.getElementById("arquivo");
    entrada.addEventListener("change", () => {
      const [arquivo] = entrada.files;
      if (arquivo) processarArquivo(arquivo);
      entrada.value = ""; // permite reenviar o mesmo arquivo
    });
  }

  function configurarArrastar() {
    const zona = document.getElementById("dropzone");
    const alternar = (ativa) => zona.classList.toggle("dropzone--ativa", ativa);

    ["dragenter", "dragover"].forEach((nome) =>
      zona.addEventListener(nome, (evento) => { evento.preventDefault(); alternar(true); })
    );
    ["dragleave", "drop"].forEach((nome) =>
      zona.addEventListener(nome, (evento) => { evento.preventDefault(); alternar(false); })
    );
    zona.addEventListener("drop", (evento) => {
      const [arquivo] = evento.dataTransfer.files;
      if (arquivo) processarArquivo(arquivo);
    });
  }

  configurarSelecao();
  configurarArrastar();
})((globalThis.Certificados ??= {}));

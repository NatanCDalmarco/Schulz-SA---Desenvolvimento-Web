(function (ns) {
  class ErroPlanilha extends Error {
    constructor(mensagem) {
      super(mensagem);
      this.name = "ErroPlanilha";
    }
  }

  ns.ErroPlanilha = ErroPlanilha;
})((globalThis.Certificados ??= {}));

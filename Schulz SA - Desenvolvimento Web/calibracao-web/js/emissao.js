(function (ns) {
  const painel = document.getElementById('emissao');
  const form = document.getElementById('form-emissao');
  const status = document.getElementById('emissao-status');
  const links = document.getElementById('emissao-links');
  let pontosAtuais = null;
  let arquivoAtual = '';
  function esconder() {
    painel.hidden = true;
    links.hidden = true;
    status.textContent = '';
    pontosAtuais = null;
  }
  function preparar(pontos, arquivo) {
    pontosAtuais = pontos;
    arquivoAtual = arquivo;
    painel.hidden = false;
    links.hidden = true;
    links.replaceChildren();
    status.textContent = 'Prévia calculada no navegador; registro definitivo é recalculado no servidor.';
  }
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!pontosAtuais) return;
    links.hidden = true;
    const botao = form.querySelector('button');
    botao.disabled = true;
    status.textContent = 'Registrando...';
    try {
      const resposta = await fetch('/api/certificados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-issuer-token': document.getElementById('chave-emissao').value },
        body: JSON.stringify({
          tag: document.getElementById('tag-instrumento').value,
          tecnico: document.getElementById('tecnico').value,
          arquivo: arquivoAtual,
          pontos: pontosAtuais,
        })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Erro de comunicação com o serviço.');
      const base = '/api/certificados/' + encodeURIComponent(dados.id);
      const linkVerificar = document.createElement('a');
      linkVerificar.href = '/verificar.html?id=' + encodeURIComponent(dados.id);
      linkVerificar.textContent = 'Abrir validação do certificado';
      const linkPdf = document.createElement('a');
      linkPdf.href = base + '/pdf';
      linkPdf.textContent = 'Baixar PDF demonstrativo';
      linkPdf.target = '_blank';
      linkPdf.rel = 'noopener';
      const qr = document.createElement('img');
      qr.src = base + '/qr.svg';
      qr.alt = 'QR Code para consulta pública do certificado';
      qr.className = 'imagem-qr';
      const numero = document.createElement('p');
      numero.textContent = 'ID do certificado: ' + dados.id;
      links.replaceChildren(numero, qr, linkVerificar, document.createTextNode(' | '), linkPdf);
      links.hidden = false;
      status.textContent = 'Certificado registrado. Confira o QR Code e o PDF.';
      document.getElementById('chave-emissao').value = '';
    } catch (erro) {
      status.textContent = erro.message;
    } finally { botao.disabled = false; }
  });
  ns.Emissao = { preparar, esconder };
})((globalThis.Certificados ??= {}));

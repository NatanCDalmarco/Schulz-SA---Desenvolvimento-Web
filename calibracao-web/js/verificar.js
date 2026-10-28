(async function () {
  const corpo = document.getElementById('dados-certificado');
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    corpo.textContent = 'ID não informado ou inválido.'; return;
  }
  try {
    const resposta = await fetch('/api/certificados/' + id);
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Certificado não encontrado.');
    const el = (tag, texto) => { const e = document.createElement(tag); e.textContent = String(texto); return e; };
    const d = document.createElement('div');
    d.append(
      el('h2', 'Certificado demonstrativo'),
      el('p', 'ID: ' + dados.id),
      el('p', 'TAG: ' + dados.tag),
      el('p', 'Técnico: ' + dados.tecnico),
      el('p', 'Emitido em: ' + new Date(dados.emitidoEm).toLocaleString('pt-BR')),
      el('p', 'Parecer: ' + dados.parecer),
      el('p', 'SHA-256: ' + dados.sha256),
      el('p', 'Integridade do registro: ' + (dados.integridade ? 'verificada' : 'DIVERGENTE')),
      el('p', dados.observacao)
    );
    const tabela = document.createElement('table');
    const thead = document.createElement('thead');
    const linha = document.createElement('tr');
    ['Ponto', 'Padrão', 'Média', 'Erro', 'LEA', 'Status'].forEach(t => linha.append(el('th', t)));
    thead.append(linha); tabela.append(thead);
    const tbody = document.createElement('tbody');
    for (const ponto of dados.pontos) {
      const tr = document.createElement('tr');
      [ponto.ponto, ponto.padrao, ponto.media.toFixed(4), ponto.erroSistematico.toFixed(4), ponto.lea, ponto.decisao]
        .forEach(valor => tr.append(el('td', valor)));
      tbody.append(tr);
    }
    tabela.append(tbody); d.append(tabela);
    const pdf = el('a', 'Baixar PDF do certificado');
    pdf.href = '/api/certificados/' + id + '/pdf';
    pdf.target = '_blank'; pdf.rel = 'noopener';
    d.append(pdf);
    corpo.replaceChildren(d);
  } catch (e) { corpo.textContent = e.message; }
})();

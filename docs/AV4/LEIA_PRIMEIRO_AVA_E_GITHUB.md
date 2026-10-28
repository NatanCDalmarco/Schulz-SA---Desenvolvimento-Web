# ENTREGA AV4 - INSTRUÇÕES RÁPIDAS

## 1) O que vai no GITHUB

Tudo que estiver na raiz deste ZIP deve ser COPIADO para a raiz do repositório `Projeto-Aplicado-III`. **Não crie uma pasta `av4` em cima desta raiz**: a pasta `calibracao-web` é a mesma que já existe, e esta versão acrescenta novos arquivos dentro dela, preservando o código original da AV3.

**Modo recomendado (terminal Git, preserva histórico):**

```bash
git clone https://github.com/Otavio-Mrq/Projeto-Aplicado-III.git
cd Projeto-Aplicado-III
# copie para ESTA pasta o conteúdo do ZIP (README.md, calibracao-web/, cloud/, ...)
git status
git add README.md README_AV3_ORIGINAL.md calibracao-web cloud requirements.txt template.yaml tests docs/AV4
git commit -m "AV4: consulta por QR Code, certificado PDF e infraestrutura AWS SAM"
git push origin main
```

**Evite:** subir o ZIP inteiro como arquivo no GitHub, usar FTP, apagar a pasta `calibracao-web` ou enviar chaves AWS e senhas no commit. A cópia precisa preservar os arquivos antigos não modificados, e mesclar a pasta `calibracao-web`. Caso use GitHub Desktop/VS Code, equivale a copiar, conferir diferenças, fazer commit e push.

## 2) O que vai no AVA

**Um único PDF:** `docs/AV4/RELATORIO_AV4_BASE_PREENCHER.pdf` depois que preencher os campos e adicionar evidências de AWS real e o link do vídeo YouTube (não listado serve). O PDF final precisa conter:

- Unidade curricular, professor, grupo (nomes completos), RAs, repositório GitHub.
- Descrição da solução Web (telas e fluxos), arquitetura realmente implementada e justificativa das mudanças em relação à AV2.
- Matriz de rastreabilidade, testes e evidências de uso.
- Comandos/resultados do deploy na AWS e URL HTTPS real do serviço.
- Imagens do sistema funcionando na AWS + link do vídeo narrado no YouTube.

**O ZIP não vai no AVA.** O GitHub é enviado como LINK dentro do PDF. O vídeo é publicado no YouTube e também entra como LINK no PDF.

## 3) Ainda tem que fazer

1. Subir este código no GitHub.
2. Implantar na AWS com SAM (ver README); testar com DADOS FICTÍCIOS.
3. Gravar demonstração real na URL da AWS; publicar como vídeo não listado.
4. Informar os 5 RAs, URL da AWS e vídeo no PDF e incluir capturas da AWS antes de subir o relatório no AVA.

**Sem AWS/vídeo real a entrega fica INCOMPLETA em relação ao roteiro AV4.** O relatório-base não deve ser usado para declarar que isso já foi executado.

# Projeto Aplicado III - Schulz S.A. | AV4

**Continuação do repositório original:** https://github.com/Otavio-Mrq/Projeto-Aplicado-III  
**Empresa parceira:** Schulz S.A.  
**Equipe:** Otávio Marques, Bruno Gabriel, João Roma, Nathan Dalmarco e Alexandre Melo.

## Estado real da entrega

- ✅ **Preservado o projeto original AV3:** `calibracao-web/` com upload de XLSX, média, erro, tolerância e parecer calculado em JavaScript no navegador.
- ✅ **Adicionada a AV4 como PoC:** API Python para registrar resultados recalculados, consultar por identificador/QR e baixar certificado demonstrativo em PDF.
- ✅ **Banco para deploy:** DynamoDB por meio da stack SAM em `template.yaml`; armazenamento temporário em memória **somente** no modo local para demonstração.
- ✅ **Testes automatizados locais:** `python -m unittest discover -s tests -v`.
- ⚠️ **Deploy AWS não executado pelo autor do pacote:** depende de conta AWS, credenciais, instalação do AWS SAM e validação. Não há URL ativa nem vídeo comprovando AWS.
- ⚠️ **Uso acadêmico:** não utilizar com dados empresariais reais. Verificação é pública, autenticação de emissão é por chave e o PDF não possui assinatura digital metrológica válida.
- ⚠️ **Mudança de arquitetura:** AV2 propunha S3+Lambda+RDS+SNS. A AV4 deste pacote adota Lambda Function URL + DynamoDB para reduzir o escopo de demonstração. **RDS/SNS/S3 transacionais não foram implementados nesta versão.**

## Rodar localmente

Requisitos: Python 3.12+ e pacotes de `requirements.txt`. Execute na raiz:

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m cloud.local_server
```

Abra http://127.0.0.1:8000/ e envie um dos arquivos em `calibracao-web/exemplos`. Preencha TAG e técnico e utilize a chave de **uso local** `demo-av4-local-apenas`. O registro fica em memória somente enquanto o servidor estiver aberto.

**Importante:** não abra `index.html` diretamente com `file://` para a AV4. O registro e a consulta exigem o servidor HTTP.

## Implantação AWS (ainda pendente)

1. Instale e configure AWS CLI e AWS SAM CLI. A conta é de responsabilidade da equipe.
2. Confira preços/cotas/limites atuais do Free Tier antes de criar recursos. **Não há garantia de custo zero**, mesmo com alertas orçamentários.
3. Configure IAM com permissões mínimas, alertas de faturamento e teto de uso; não suba arquivos de dados da empresa.
4. No terminal, execute:

```bash
sam build
sam deploy --guided
```

No parâmetro `EmissionToken`, informe uma chave longa exclusiva. Nunca a publique no GitHub/relatório. Registre a saída `WebUrl` que o AWS SAM fornecer. Teste login via chave, publicação de dados fictícios, consulta QR e PDF em HTTPS. Depois grave um vídeo narrado do **endereço AWS real** e publique no YouTube como não listado.

Para remover recursos de teste e evitar cobranças, use `sam delete` depois de salvar o vídeo, ciente de que a tabela de dados será excluída. Confira também console de cobrança. O SAM cria os recursos somente se você fizer o deploy.

## Estrutura dos arquivos

```text
calibracao-web/                Interface AV3 preservada + formulários AV4 e exemplos XLSX
cloud/app.py                  API Lambda: emissão, consulta, PDF e QR
cloud/local_server.py         Servidor HTTP local apenas para testes
requirements.txt              Dependências para execução e pacote Lambda
template.yaml                 Definição infraestrutura AWS SAM
README_AV3_ORIGINAL.md        README histórico recebido do GitHub
tests/test_api.py             Testes automatizados da API
docs/AV4/                     Relatório PDF + instruções de entrega
```

## Limitações relevantes

O código do GitHub recebido não contém o backend Flask descrito no PDF AV3 nem a implementação do fluxo S3 → Lambda → RDS → SNS. Assim, a entrega preserva o front-end original e adiciona um backend compacto, **não sendo integração ao código Python original do PDF**. As planilhas originais têm suporte a XLSX; CSV, persistência de planilhas brutas, rastreabilidade RBC completa, MFA/RBAC, auditoria e assinatura eletrônica qualificada não foram implementadas. No backend, a incerteza demonstrativa é exclusivamente **Tipo A**, com fator `k=2`. Os resultados da API são recalculados e não confiados ao cálculo do navegador.

## Orientações de entrega

Leia `docs/AV4/LEIA_PRIMEIRO_AVA_E_GITHUB.md` antes de enviar. O PDF incluído é uma **base preenchível**: faltam RA dos integrantes, endereço AWS realmente executado, prints de execução AWS e URL do vídeo real. Não entregue evidências inventadas.

# Schulz S.A. — Sistema Web de Calibração Metrológica

> **Projeto Aplicado III — Faculdade SENAI SC (UniSENAI)**  
> **Empresa Parceira:** Schulz S.A. — Unidade Usinagem / Laboratório de Metrologia  
> **Tema:** Automação e Digitalização do Processo de Calibração Metrológica e Validação do Erro Máximo Permissível (EMP)

---

## Visão Geral do Projeto

O **`calibracao-web`** é a aplicação MVP (Produto Mínimo Viável) desenvolvida como entrega final (**AV3**) do **Projeto Aplicado III**. O sistema automatiza a ingestão, validação, cálculo e geração de pareceres metrológicos a partir de dados de medição de instrumentos da fábrica da **Schulz S.A.** (ex: paquímetros, micrômetros, relógios comparadores e manômetros).

O projeto consolida as três etapas do ciclo de vida da solução:
1. **AV1 (Modelagem de Negócio e Dados):** Modelagem do Dicionário de Dados relacional, regras de negócio metrológicas (RN01 a RN05) e critérios de aceitação metrológica.
2. **AV2 (Arquitetura em Nuvem):** Arquitetura serverless e microsserviços na AWS (Amazon S3, AWS Lambda, Amazon RDS PostgreSQL e Amazon SNS).
3. **AV3 (MVP Prático e Web):** Aplicação frontend/backend web para upload de planilhas de campo, cálculo automático de incertezas e geração do Certificado Digital de Calibração.

---

## Funcionalidades Principais

* ** Ingestão e Sanitização Automatizada:** Upload de planilhas no formato `.xlsx`/`.csv` contendo medições repetidas ($L_1, L_2, L_3$). Tratamento automático de separadores decimais e remoção de inconsistências.
* ** Motor Metrológico Avançado:**
  * Cálculo da Média das Leituras ($\bar{L}$).
  * Determinação do Erro Sistemático ($E = \bar{L} - V_{\text{nominal}}$).
  * Avaliação de Incerteza Tipo A (desvio-padrão das repetições) e Incerteza Combinada/Expandida ($U$, $k=2$).
* ** Regra de Decisão Metrológica (RN02):**
  * **APROVADO:** $|\text{Erro}| + U \le \text{EMP}$ (Atende à tolerância de processo dentro da faixa de confiança de 95,45%).
  * **APROVADO CONDICIONAL:** $|\text{Erro}| \le \text{EMP}$, mas $|\text{Erro}| + U > \text{EMP}$.
  * **REPROVADO:** $|\text{Erro}| > \text{EMP}$.
* ** Trava de Validade do Padrão RBC (RN01):** Verificação imediata do status de calibração do Padrão de Referência. Bloqueio automático do lote se o padrão estiver vencido.
* ** Validação de Condições Ambientais (RN03):** Registro de Temperatura ($20^\circ\text{C} \pm 2^\circ\text{C}$) e Umidade Relativa (40% a 60%) com emissão automática de ressalva técnica no parecer.
* ** Relatórios e Certificados Digitais:** Exportação do relatório em PDF/HTML com Hash de Integridade SHA-256 e QR Code para auditorias do SGQ (ISO 9001 / IATF 16949).

---

##  Arquitetura do Sistema

A aplicação integra a interface Web com o ecossistema Serverless projetado para a nuvem AWS:

```
[ Planilha Excel / Ingestão Web ]
              │
              ▼
    [ Frontend Web (HTML/JS) ] ───► [ Validação de Regras (RN01-RN03) ]
              │                                      │
              ▼                                      ▼
     [ Amazon S3 Bucket ] ──(Trigger)──► [ AWS Lambda (Motor de Cálculo) ]
                                                     │
                                                     ▼
                                         [ Amazon RDS (PostgreSQL) ]
                                                     │
                                                     ▼
                                          [ Amazon SNS (Alertas) ]
```

---

## Estrutura do Repositório

```
calibracao-web/
├── index.html              # Interface principal do painel de calibração
├── css/
│   └── styles.css          # Estilização visual (Layout Schulz S.A.)
├── js/
│   ├── calculos.js         # Motor metrológico (Média, Erro, Incerteza U, k=2)
│   ├── leitor-planilha.js  # Parser e sanitizador de planilhas Excel/CSV
│   └── app.js              # Controlador principal da aplicação web
├── templates/
│   └── modelo_ensaio.xlsx  # Modelo de planilha padrão de entrada para os operadores
└── README.md               # Documentação técnica do projeto
```

---

## Fórmulas Metrológicas Aplicadas

| Parâmetro | Fórmula | Descrição |
| :--- | :--- | :--- |
| **Média ($\bar{L}$)** | $\bar{L} = \frac{1}{n} \sum_{i=1}^{n} L_i$ | Média das repetições ($n=3$) |
| **Erro Sistemático ($E$)** | $E = \bar{L} - V_{\text{nominal}}$ | Desvio em relação ao valor de referência |
| **Incerteza Tipo A ($u_a$)** | $u_a = \frac{s}{\sqrt{n}}$ | Contribuição da repetibilidade das medições |
| **Incerteza Expandida ($U$)** | $U = 2 \times \sqrt{u_a^2 + u_{padrao}^2}$ | Incerteza combinada com fator de abrangência $k=2$ (95,45%) |

---

## 🛠️ Como Executar a Aplicação

### Pré-requisitos
* Qualquer navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge).
* Não requer instalação de servidor local para testes do frontend (executável diretamente via arquivo estático ou extensão *Live Server* do VS Code).

### Passo a Passo
1. Clone este repositório:
   ```bash
   git clone https://github.com/seu-usuario/calibracao-web.git
   ```
2. Abra a pasta do projeto:
   ```bash
   cd calibracao-web
   ```
3. Abra o arquivo `index.html` em seu navegador.
4. Faça o upload do arquivo modelo localizado em `templates/modelo_ensaio.xlsx`.
5. Confira os dados processados e o parecer final do instrumento.

---

## Conformidade Normativa e Qualidade

* **ISO/IEC 17025:** Requisitos gerais para a competência de laboratórios de ensaio e calibração.
* **VIM (Vocabulário Internacional de Metrologia):** Conceitos e definições formais de erros, incerteza e medição.
* **IATF 16949 / ISO 9001:** Rastreabilidade metrológica e controle de equipamentos de monitoramento na indústria automotiva.

---

## 👥 Autores e Agradecimentos

* **Equipe de Desenvolvimento:** Alunos do Curso de Engenharia/Análise e Desenvolvimento de Sistemas (UniSENAI SC).
* **Orientação Acadêmica:** Corpo docente do Projeto Aplicado III — UniSENAI.
* **Parceiro Industrial:** Equipe da Metrologia e Qualidade — **Schulz S.A.**

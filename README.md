# Processo Seletivo Afya / QA Pleno — Solução de Engenharia de Qualidade

Este repositório contém a solução técnica completa, executável e auditável para o desafio de Engenharia de Qualidade e Automação de Testes da Afya.

---

## Visão Geral da Entrega & Matriz de Evidências

| Etapa | Módulo | Pontos | Evidência Principal / Artefato Entregue | Status |
| :---: | :--- | :---: | :--- | :---: |
| **01** | Estratégia e Risco | 15 | Documentação de estratégia de testes e Matriz de Cobertura RBT em `docs/estrategia-e-riscos.md`. | **Concluído** |
| **02** | Web / Playwright | 25 | Automação E2E com Page Objects, isolamento de sessão e resiliência em `tests/web/`. | **Concluído** |
| **03** | API / Restful Booker | 15 | Testes de contrato (oráculos), ciclo de vida, cenários negativos e cleanup automatizado em `tests/api/`. | **Não realizado** |
| **04** | Review e Correção | 15 | Correção de `reconcile.ts` (100% coberto em `tests/unit/reconcile.spec.ts`) e refatoração do teste flaky de checkout em `tests/web/checkout-review.spec.ts`. Análise em `docs/review.md`. | **Concluído** |
| **05** | SQL e Análise de Dados | 10 | Consultas SQL de validação financeira em `sql/reconciliation_queries.sql` e evidências tabulares em `sql/results.md`. | **Não realizado** |
| **06** | CI/CD e Triagem | 10 | Workflow confiável do GitHub Actions em `.github/workflows/e2e-ci.yml` sem mascaramento de falhas. | **Não realizado** |
| **07** | Parecer de Release | 10 | Parecer de decisão NO-GO em `docs/release.md` e planos técnicos de performance/segurança em `docs/nao-funcionais.md`. | **Concluído** |
| **TOTAL**| | **100** | | |

---

## Pré-requisitos do Sistema

Para reproduzir a execução em uma máquina limpa, certifique-se de ter instalado:

* **Node.js**: `v18.x` ou superior (Recomendado: `v20.x LTS`)
* **npm**: `v9.x` ou superior
* **Git**

---

## Instalação e Configuração Passo a Passo

### 1. Clonar o repositório
```bash
git clone https://github.com/izaramos/processoSeletivo_Afya
```

### 2. Instalar Dependências e Navegadores do Playwright
```bash
npm ci
npx playwright install --with-deps chromium
```

### 3. Checagem Estática de Tipos (TypeScript)
Verifique se há erros de compilação no projeto:
```bash
npm run typecheck
```

---

## Comandos para Execução dos Testes
### A. Executar Testes Unitários e Reconciliação (Etapa 04 - Parte A)
```bash
npx playwright test tests/unit/reconcile.spec.ts
```

### B. Executar Testes de API (Etapa 03)
```bash
npx playwright test tests/api/
```

### C. Executar Testes E2E Web (Etapas 02 e 04 - Parte B)
```bash
# Modo Headless (padrão)
npx playwright test tests/web/

# Modo Visual (Headed - com navegador aberto)
npx playwright test tests/web/ --headed
```

### D. Executar Todos os Testes do Projeto
```bash
npx playwright test
```

### E. Visualizar o Relatório de Execução (HTML Report)
Após rodar qualquer suíte, abra o relatório interativo:
```bash
npx playwright show-report
```
--- 

## Estrutura de Pastas do Repositório
```text
TesteTecnico_IzabelleTome/
├── docs/
│   ├── estrategia.md            # Etapa 01: Matriz de Risco e Cobertura
│   ├── review.md                # Etapa 04: Análise detalhada do teste flaky e da reconciliação
│   ├── release.md               # Etapa 07: Parecer executivo de liberação (NO-GO)
│   └── nao-funcionais.md        # Etapa 07: Planos técnicos de Carga, Resiliência e Segurança
├── sql/
├── tests/
│   ├── pages/                    # Etapa 02: Testes E2E
│   │   └── CartPage.ts
│   │   └── CheckoutPage.ts
│   │   └── InventoryPage.ts
│   │   └── LoginPage.ts          
│   ├── checkout-review.spec.ts  # Etapa 04: Código corrigido do motor de reconciliação
│   ├── jornadas.spec.ts         # Etapa 02: Testes E2E
│   ├── reconcile.spec.ts        # Etapa 04: Testes unitários do Reconcile            
├── playwright.config.ts         # Configuração centralizada do Playwright
├── package.json
└── README.md
```

---
## Registro Transparente do Desenvolvimento e Uso de IA
1. **Tempo Total Investido: ~8 horas dedicadas à modelagem de riscos, implementação e documentação técnica.**

2. **Uso da Inteligência Artificial (Gemini / Assistente de IA)**:
   * **Estruturação e Validação da Função `reconcile.ts`**: Auxílio na modelagem rigorosa do tipo de retorno ReconcileResult e cobertura de casos de borda (reentrega de eventos/idempotência e detecção de wrong owner).
   * **Refatoração do Teste E2E Flaky (`checkout-review.spec.ts`)**: Identificação rápida de maus padrões (como `try/catch` engolindo erros, `waitForTimeout` e `click({ force: true })`) e conversão para Web-First Assertions do Playwright.
   * **Formatação dos Planos Não-Funcionais e Parecer de Release**: Aceleração na criação dos arquivos Markdown garantindo a distinção entre fatos e hipóteses, e detalhamento de estratégias de mitigação.
   * **Descoberta de Arquivos no Windows (CMD vs Git Bash)**: O Playwright executava testes padrão de exemplo em cache devido à confusão entre barras de caminho (`test/` vs `test\`) no ambiente Windows.
   * **Erro de Navegação e Herança de Configuração (`baseURL`)**: Ocorreu o erro `Protocol error (Page.navigate): Cannot navigate to invalid URL` ao rodar a matriz de testes com múltiplos navegadores, pois chamadas como `page.goto('/')` não encontravam a URL base
   * **Ausência do Relatório HTML**: O comando `npx playwright show-report` retornava `No report found` após execuções com 100% de sucesso.

3. **Testes Não Executados & Impedimentos**:
    * Etapa 03 (API), Etapa 05 (SQL) e Etapa 06 (CI/CD) não foram concluídas em virtude do tempo disponível para a entrega. Optou-se por focar no aprofundamento das Etapas 01, 02, 04 e 07, mantendo a qualidade, corretude e a ausência de "relatórios verdes sem evidência".

---

## Informações da Candidata
* Nome: Izabelle Ramos Tomé
* Cargo: Qualidade de Software / QA Pleno
* Data da Entrega: Setembro de 2026
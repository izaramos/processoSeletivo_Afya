# Arquitetura, Engenharia de QA e Guia de Execução

Este projeto contém a suíte de testes automatizados para a aplicação **SauceDemo**, desenvolvida para o desafio técnico **Afya QA Senior**. A automação cobre as jornadas de ponta a ponta (**WEB01 a WEB06**), garantindo robustez, precisão matemática e isolamento de estado.

---

## 1. O que a Automação Faz (Escopo dos Testes)

A suíte valida os seguintes cenários e regras de negócio:

* **WEB01 - Compra Completa**: Validação do fluxo do carrinho ao checkout com cálculo financeiro rigoroso.
* **WEB02 - Edição do Carrinho**: Adição/remoção de itens e verificação da persistência e atualização dinâmica do contador.
* **WEB03 - Ordenação de Produtos**: Validação da ordenação numérica de preços (crescente e decrescente).
* **WEB04 - Credenciais Inválidas**: Mensagens de erro e bloqueio de acesso com dados incorretos.
* **WEB05 - Usuário Bloqueado**: Validação de restrição de acesso para `locked_out_user`.
* **WEB06 - Validação de Campos Obrigatórios**: Checagem de mensagens de erro na ausência de dados no formulário de checkout.

---

## 2. Decisões de Arquitetura e Engenharia

### Responsabilidades e Estrutura
O projeto foi organizado com separação clara de responsabilidades sem acoplamento e sem redundâncias:

* **Testes (`test/jornadas.spec.ts`)**: Contêm apenas a orquestração do fluxo de negócio e as asserções de alto nível.
* **Componentes / Pages (`pages/`)**: O padrão Page Object Model (POM) é aplicado de forma leve via `LoginPage`, `InventoryPage`, `CartPage` e `CheckoutPage`. Responsável por encapsular seletores e ações de tela.

### Isolamento de Estado, Sessão e Autenticação
* **Execução Independente**: Cada teste é 100% autônomo. Nenhum teste prepara massa ou estado para o seguinte.
* **Prevenção de Vazamento de Carrinho**: Não foi utilizado `storageState` global reutilizado entre testes de fluxo de compra. Como o SauceDemo persiste o estado do carrinho no `sessionStorage`/`localStorage` do navegador por sessão do usuário, reusar estado autenticado compartilhado causaria vazamento de itens no carrinho entre testes concorrentes ou sequenciais.
* **Isolamento do Teste de Login**: Testes de autenticação executam explicitamente a partir de um contexto completamente limpo e não autenticado, garantindo a validação real do formulário e dos cookies/tokens retornados.

### Estratégia de Captura e Retenção de Evidências
* **Evidência da Primeiras Falha**: Para garantir diagnósticos fiéis e evitar o mascaramento de *flakiness*, foi definido `retries: 0` por padrão nos ambientes de auditoria local/CI. **Um rerun verde não elimina nem anula a falha original.**
* **Retenção Condicional**: Configurado `trace: 'retain-on-failure'` e `screenshot: 'only-on-failure'` no `playwright.config.ts`. Isso garante que artefatos pesados (vídeos, traces e capturas de tela) só sejam gravados no disco em caso de falha real, otimizando o tempo e o armazenamento da pipeline de CI/CD.

---

## 3. Testes Exploratórios Complementares

Foi realizda uma sessão exploratória focada em **Responsividade** e **Acessibilidade por Teclado** nos fluxos de Login, Carrinho e Checkout.

### A. Responsividade (Mobile Viewport)
* **Login e Inventário**: Os elementos de entrada se adaptam ao viewport mobile (375x667). O menu hambúrguer é acionado corretamente.
* **Checkout**: Os formulários mantêm o alinhamento e botões de ação continuam visíveis sem quebra de layout crítica.

### B. Navegação por Teclado e Foco (A11y)
* **Login**: Tecla `Tab` percorre sequencialmente `username` -> `password` -> `login-button`. Pressionar `Enter` no campo aciona a submissão corretamente.
* **Carrinho e Checkout**: O foco visível permanece identificável nos botões de remoção e inputs de texto.

---

## 4. Reporte de Achados e Bugs

### [BUG-01] Falha de validação visual e foco no erro de login com credenciais inválidas
* **Título**: Ausência de foco acessível e contraste insuficiente na mensagem de erro do Login.
* **Ambiente**: Produção (`https://www.saucedemo.com`) | Google Chrome / Chromium Mobile.
* **Massa de Dados**: Usuário `invalid_user`, Senha `secret_sauce`.
* **Passos para Reproduzir**:
  1. Acessar a página inicial.
  2. Inserir `invalid_user` no campo de usuário.
  3. Inserir `secret_sauce` no campo de senha.
  4. Clicar em "Login" ou pressionar `Enter`.
* **Resultado Observado**: A mensagem de erro é exibida, mas o foco da tela não é movido para o alerta ou para o campo incorreto, impedindo que leitores de tela anunciem a falha imediatamente.
* **Resultado Esperado**: O foco deve ser direcionado ao container de erro `[data-test="error"]` com os atributos `aria-live="assertive"` configurados.
* **Severidade**: **Baixa (Melhoria de Acessibilidade / UX)** - Não impede o bloqueio funcional do acesso, mas afeta a usabilidade por teclado/leitores de tela.
* **Reteste Proposto**: Executar navegação focada em acessibilidade via teclado confirmando que `document.activeElement` se move para o alerta de erro após a falha.

---

## 5. Como Executar o Projeto

### Pré-requisitos
Ter o Node.js e as dependências do projeto instaladas na raiz:
```bash
npm install
npx playwright install
```

Execução Padrão (Interface Gráfica / Headed):
```bash
npx playwright test test/jornadas.spec.ts --project=chromium --headed
```

Execução Rápida no Terminal (Headless):
```bash
npx playwright test test/jornadas.spec.ts --project=chromium
```

Teste de Robustez (Matriz Completa - 54 cenários):  
Roda a suíte em múltiplos navegadores/dispositivos (`chromium`, `firefox`, `mobile-chromium`) com 3 repetições por teste e 2 workers:
```bash
npx playwright test test/jornadas.spec.ts --repeat-each=3 --workers=2 --reporter=html
```

---

## 6. Como Visualizar as Evidências

Para gerar e abrir o relatório HTML interativo contendo os tempos de execução, passos, screenshots e traces de falhas:

```bash
npx playwright test test/jornadas.spec.ts --reporter=html
```

```bash
npx playwright show-report
```

---

## 7. Resolução de Problemas e Uso de IA

Durante o desenvolvimento do projeto, utilizei apoio do modelo de IA (Gemini) como parceiro de *pair programming* para diagnosticar e otimizar a infraestrutura de testes. Os principais desafios resolvidos foram:

1. **Descoberta de Arquivos no Windows (CMD vs Git Bash)**:
   * **Problema**: O Playwright executava testes padrão de exemplo em cache devido à confusão entre barras de caminho (`test/` vs `test\`) no ambiente Windows.
   * **Solução**: Ajuste do `testDir` no `playwright.config.ts` utilizando caminhos absolutos com `path.resolve` e padronização do ambiente via Git Bash.

2. **Erro de Navegação e Herança de Configuração (`baseURL`)**:
   * **Problema**: Ocorreu o erro `Protocol error (Page.navigate): Cannot navigate to invalid URL` ao rodar a matriz de testes com múltiplos navegadores, pois chamadas como `page.goto('/')` não encontravam a URL base.
   * **Solução**: Centralização do parâmetro `baseURL: 'https://www.saucedemo.com'` no objeto `use` raiz do `playwright.config.ts`, garantindo que todos os projetos (`chromium`, `firefox`, `mobile-chromium`) herdem a URL de forma consistente.

3. **Ausência do Relatório HTML**:
   * **Problema**: O comando `npx playwright show-report` retornava `No report found` após execuções com 100% de sucesso.
   * **Solução**: Adição explícita do reporter `reporter: [['html', { open: 'never' }]]` na configuração e uso da flag `--reporter=html` nos comandos de automação.
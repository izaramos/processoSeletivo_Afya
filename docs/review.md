# Review e correção com evidência

## Reconciliação Financeira (`reconcile.ts`)

### 1. Análise de Defeitos e Riscos

| Linha Original | Risco / Problema Identificado | Exemplo de Entrada Mutante | Resultado Original (Errado) | Resultado Esperado (Correto) 
| :--- | :--- | :--- | :--- | :--- |
| Linhas 18–20 | Não filtra `status === 'SUCCEEDED'`. Transações capturadas que falharam são somadas como receita válida. | `[{ orderId: 1, kind: 'CAPTURE', status: 'FAILED', amountCents: 10000 }]` | `capturedCents: 10000` | `capturedCents: 0` |
| Linha 21 | Considera qualquer evento de refund (mesmo com status `FAILED` ou pertencente a outro pedido) na lista. | `[{ orderId: 99, kind: 'REFUND', status: 'SUCCEEDED' }]` | `hasRefund: true` | `hasRefund: false` |
| Linhas 22–23 | Ignora o `orderId` e o `studentId` ao contar acessos. Conta acessos ativos de outros alunos/pedidos no mesmo curso. | `[{ orderId: 99, studentId: 88, courseId: 10, status: 'ACTIVE' }]` | `activeCount: 1` | `activeCount: 0` |
| Linha 26 | Regra de acesso simplista baseada apenas em booleano `!hasRefund`, ignorando o valor líquido retido (`netCents`). | `CAPTURES: 10000, REFUNDS: 2000 (Refund parcial)` | `shouldHaveAccess: false` | `shouldHaveAccess: true` |
| Geral (Novos campos) | Ausência dos campos obrigatórios pelas regras de negócio: refundedCents, netCents e hasWrongOwner. | Qualquer entrada | Campos inexistentes | Retornar campos devidamente calculados |

## Review e Correção do Teste E2E Flaky (`docs/review.md`)

### 2. Análise Crítica do Arquivo `checkout.spec.ts.txt`

#### Diagnóstico de Anti-Patterns e Anti-Sinais de Qualidade
1. **Uso de `test.only` (Linha 03)**:
   * **Risco**: Bloqueia a execução de toda a suíte de testes do projeto em pipelines de CI, gerando falsa cobertura verde por omitir a execução de centenas de outros cenários.
2. **Incompatibilidade do Nome com o Fluxo Executado**:
   * **Problema**: O teste é denominado `checkout`, porém ele apenas realiza o login, adiciona um item genérico e clica no carrinho. Ele não insere dados de checkout (nome, sobrenome, CEP) nem clica em Finish. Não há teste de checkout.
3. **Gargalos de Desempenho e Sleeps Fixos (Linha 09)**:
   * **Anti-pattern**: `await page.waitForTimeout(5000)` introduz latência artificial e não garante que os elementos subsequentes estarão prontos em redes lentas.
4. **Interação Forçada Sem Acessibilidade (Linha 10)**:
   * **Anti-pattern**: `page.locator('button').first().click({ force: true })`.
   * **Risco**: O seletor `button.first()` é altamente ambíguo e instável. O parâmetro `{ force: true }` ignora estados de visibilidade e desabilitação do elemento, clicando em elementos ocultos/cobertos e mascarando defeitos reais de UI/UX.
5. **Asserção Síncrona Frágil em Elementos Dinâmicos (Linha 12)**:
   * **Anti-pattern**: `expect(page.locator('.inventory_item_name').isVisible()).toBeTruthy()`.
   * **Risco**: `.isVisible()` é um método síncrono que avalia o DOM no exato milissegundo em que é invocado. Se a página estiver renderizando, retornará false e causará falha prematura. Deve-se usar a Web-First Assertion: `await expect(locator).toBeVisible()`.
6. **Mascaramento de Falhas com `try/catch` (Linhas 13–17)**:
   * **Crime de QA**: O bloco `try/catch` captura a exceção da asserção do carrinho e exibe um `console.log`, permitindo que a execução termine em verde mesmo quando a aplicação falhou em adicionar o item ao carrinho. Este é o clássico exemplo de "O verde que mente".

### 3. Arquitetura & Desenho Técnico: Idempotência e Concorrência Real
#### Limites da Função Pura Local
Testes unitários com funções puras (como `reconcile()`) são determinísticos e isolados. Eles provam as regras de transformação matemática, mas não provam a segurança do sistema sob concorrência e banco de dados real pelos seguintes motivos:

1. Condição de Corrida: Duas requisições simultâneas podem ler o mesmo saldo/estado do banco antes que qualquer uma grave a alteração.

2. Ausência de Isolamento Transacional: A função pura assume que o array de eventos recebido já está completo e ordenado. Na vida real, conexões HTTP/Webhooks podem chegar fora de ordem ou duplicadas em instantes idênticos em threads paralelas.

#### Propagação e Desenho para Duas Entregas Simultâneas
```text
    ┌────────────────────────┐
    │   Webhook / Evento     │
    └───────────┬────────────┘
                │
                ▼
    ┌─────────────────────────────────┐
    │    Chave de Idempotência        │
    │  (Redis Lock por eventId/order) │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────┐
    │ Transação BD (Isolation LEVEL)  │
    │ SELECT ... FOR UPDATE (Lock)    │
    └────────────────┬────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────┐
    │   Constraint de Banco de Dados  │
    │ UNIQUE KEY (order_id, student)  │
    └─────────────────────────────────┘
```

#### Proteções de Persistência Propostas:

1. Chave Única de Banco de Dados (`UNIQUE Constraint`):
* Na tabela `accesses`, criar uma restrição de unicidade composta:
```bash
ALTER TABLE accesses ADD CONSTRAINT unique_active_student_course 
UNIQUE (student_id, course_id, order_id);
```
* Se duas threads tentarem inserir o mesmo acesso para o pedido/aluno simultaneamente, o banco de dados rejeitará a segunda transação com erro de Constraint Violation.

2. Bloqueio Pessimista na Transação (`SELECT FOR UPDATE`):
* Ao processar um webhook de reconciliação, a transação deve travar a linha do pedido no banco de dados até a conclusão:
```bash
BEGIN;
SELECT * FROM orders WHERE id = 101 FOR UPDATE;
COMMIT;
```

3. Mecanismo de Distributed Lock via Redis:
* Antes de iniciar o processamento da reconciliação de um `orderId`, o worker adquire uma chave no Redis com TTL curto:
```bash
SET lock:reconcile:order:101 "LOCKED" NX EX 5
```
* Se uma segunda entrega paralela tentar processar o mesmo `orderId`, o lock falha e a mensagem é devolvida para a fila com backoff exponencial.

---

## Como Executar o Projeto

### Pré-requisitos
Ter o Node.js e as dependências do projeto instaladas na raiz:
```bash
npm install
npx playwright install
```

Execução Padrão (Interface Gráfica / Headed):
```bash
npx playwright test test/checkout-review.spec.ts --headed
```

## Como Visualizar as Evidências

Para gerar e abrir o relatório HTML interativo contendo os tempos de execução, passos, screenshots e traces de falhas:

```bash
npx playwright test test/jornadas.spec.ts --reporter=html
```

```bash
npx playwright show-report
```

---
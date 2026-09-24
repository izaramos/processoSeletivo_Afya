# Estratégia e Cobertura por Risco

## 1. Visão Geral
O sistema libera o acesso aos cursos com base nos pagamentos recebidos. Para garantir a segurança e a precisão dos dados, o sistema exige a validação do pagamento, o bloqueio de cobranças e eventos duplicados, o cumprimento do tempo limite da liberação e a ligação correta entre o aluno (`student_id`), o curso (`course_id`) e o pedido (`order_id`).

---

## 2. Matriz de Riscos Priorizados (Impacto x Probabilidade)

| ID | Risco | Categoria | Regra Relacionada | Probabilidade | Impacto | Nível de Risco | Mitigação Principal |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R01** | Liberar acesso para aluno ou curso diferente do comprador | Segurança / Negócio | RN05 | Média | Crítico | **P1 - Crítico** | Validação dos campos `student_id` e `course_id` na criação do acesso. |
| **R02** | Processamento duplicado de pagamento por reentrega de evento de sucesso | Integridade Financeira | RN02, RN03 | Alta | Alto | **P1 - Crítico** | Garantia que `event_id` no cálculo do saldo líquido exista apenas uma vez antes de conceder acesso. |
| **R03** | Concessão de múltiplos acessos `ACTIVE` para o mesmo pedido/aluno/curso | Negócio / Operacional | RN05 | Média | Alto | **P2 - Alto** | Restrição de chave única no banco de dados e validação se `activeCount` é 1. |
| **R04** | Estouro da janela de convergência de 60 segundos entre a confirmação do pagamento e a liberação do acesso | Experiência / SLA | RN07 | Média | Alto | **P2 - Alto** | Monitoramento e reconciliação assíncrona baseada na janela limite de 60 segundos. |
| **R05** | Manutenção de acesso `ACTIVE` após cancelamento do pedido ou reembolso | Negócio / Perda de Receita | RN01, RN06 | Baixa | Alto | **P2 - Alto** | Monitoramento de SLA com alertas e reconciliação automática em até 60 segundos. |
| **R06** | Inconsistência de estado por eventos recebidos fora de ordem (`FAILED` seguido de `SUCCEEDED`) | Lógica de Domínio | RN02, RN03 | Média | Médio | **P3 - Médio** | Garantir que o pagamento se mantenha setado como aprovado e ignorar falhas que cheguem depois. |

---

## 3. Regras Explícitas vs. Hipóteses para Refinamento

### Regras Explícitas (Confirmadas em Contrato RN01-RN07)
* **RN01**: Valores são inteiros em centavos. Saldo líquido é a soma de `CAPTURE` com sucesso menos `REFUND` com sucesso.
* **RN02**: `event_id` identifica evento único. Reentregas `SUCCEEDED` contam uma vez. Transição `FAILED` -> `SUCCEEDED` conta como sucesso único.
* **RN03**: Sucesso não é desfeito por `FAILED` posterior. Payload de `event_id` é invariante.
* **RN04**: Elegível se `status == CONFIRMED` e `saldo_liquido == amount_cents`. Capturas parciais somam o total.
* **RN05**: Pedido elegível gera exatamente um acesso `ACTIVE` com mesmo `order_id`, `student_id` e `course_id`.
* **RN06**: Pedido `CANCELLED` ou não elegível não pode ter acesso `ACTIVE`. Registros `REVOKED` não contam como ativos.
* **RN07**: No fluxo real fictício, o acesso deve convergir em até 60 segundos após confirmação/estorno. Na base local, todos os eventos já foram processados e não há janela de espera pendente.

### Hipóteses / Pontos de Refinamento com Produto
1. **Dados conflitantes no mesmo evento (RN03)**: Se o mesmo `event_id` chegar com um valor diferente do primeiro recebido, a aplicação deve rejeitar a requisição e emitir um alerta de inconsistência ou fraude.
2. **Reembolso Parcial (RN01, RN04)**: Se uma devolução parcial deixar o saldo pago abaixo do valor total do pedido, o acesso do usuário é cancelado.
3. **Mecanismo de Observabilidade de Convergência (RN07)**: O descumprimento da janela de 60 segundos deve disparar alertas automáticos de SLA para a equipe de engenharia ou operações.

---

## 4. Decisão de Cobertura e Estratégia de Suíte (Smoke Test)

### Critérios do Smoke Test (Execução <= 10 minutos)
O objetivo do Smoke é barrar falhas graves rapidamente na pipeline e validar os fluxos principais após cada deploy.
* **Incluído no Smoke**: 
  - Liberação de acesso após compra com sucesso (RN04, RN05).
  - Bloqueio de acesso quando o valor pago for menor que o valor total (RN01, RN04).
  - Ingestão de evento repetido sem duplicar a liberação (RN02).
  - Garantia de que o acesso seja entregue ao aluno correto (RN05).
* **Fora do Smoke (Executado na Suíte Regressiva)**:
  - Chegada de eventos fora de ordem (RN02, RN03).
  - Múltiplos pagamentos parciais somando o valor total (RN04).
  - Estornos e cancelamento de acesso (RN01, RN06).
  - Validação do tempo limite de 60 segundos para liberação (RN07).

### Agrupamento sem Acoplamento
Para evitar testes instáveis e dependentes, cada teste deve criar seus próprios dados com identificadores únicos no momento em que forem executados. Nenhum teste deve depender do resultado de outro.
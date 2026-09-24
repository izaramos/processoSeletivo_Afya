# PARECER DE LIBERAÇÃO (RELEASE GO/NO-GO DECISION)

**Data/Hora do Parecer:** 24/09/2026 às 16h  
**Janela de Depreciação/Deploy:** Planejada para 18h  
**Decisão:** **NO-GO TOTAL** (Recomendação de Impeditivo Crítico)

---

## 1. Justificativa da Decisão & Bloqueadores (Fatos vs. Hipóteses)

A liberação das 18h apresenta **risco financeiro, legal (LGPD) e operacional inaceitável**. O pipeline de integração contínua (CI) "verde" é falso-positivo, mascarando instabilidades que afetam diretamente a experiência do cliente e a integridade de dados.

### Mapeamento de Bloqueadores e Impactos

| Fato Evidenciado | Classificação | Hipótese Não Diagnosticada | Impacto no Negócio / Operação |
| :--- | :--- | :--- | :--- |
| **7.5% de atraso na liberação de acesso** (9/120 compras sintéticas levaram >120s; meta: <=60s). | **Fato** | Gargalo de concorrência na fila de webhooks ou lock de banco de dados na transação do pedido. | Chamados em massa no suporte, estornos por insatisfação e estouro de SLA. |
| **CI "Verde" mascarado via Retries** (Pipeline passou apenas após repetição em cenários críticos). | **Fato** | Presença de race conditions, chamadas assíncronas sem await ou dependência de ordem na suíte E2E. | Falso sinal de segurança; regressões graves sendo promovidas para produção. |
| **Log de tentativa de vínculo de acesso a aluno diferente** (Wrong Owner). | **Fato** | Injeção de ID incorreto na mensagem da fila ou falha de isolamento de contexto (tenant/student). | **Vazamento de dados (LGPD)** e concessão indevida de conteúdo pago a terceiros. |
| **Ausência de Reconciliação Automática** para o novo modelo de pagamentos com migração de dados. | **Fato** | Falhas na migração gerarão divergências entre valor cobrado e acesso liberado. | **Incompatibilidade Irreversível**: Reverter código não desfaz cobranças no gateway nem remove acessos errôneos. |

---

## 2. Informações Faltantes, Responsáveis e Plano Ação até às 18h

Para reduzir a incerteza antes de qualquer nova avaliação, as seguintes ações urgentes são atribuídas:

* **Métricas de Latência de Webhook/Fila (Tech Lead / DevOps)**:
  * Faltante: Identificar em qual etapa ocorre o gargalo dos 120s (Gateway -> Webhook Receiver -> Worker -> DB).
  * Ação: Isolar o gargalo entre a captura do pagamento e a escrita da permissão.
* **Auditoria de Banco de Dados no Incidente de Isolamento (DBA / SecOps)**:
  * Faltante: Query de verificação na tabela `accesses` para confirmar se algum `student_id` incorreto foi persistido durante os testes sintéticos.
  * Ação: Rodar varredura de consistência de chaves estrangeiras/propriedade.
* **Desativação de Retries no CI (QA Engine / DevOps)**:
  * Faltante: Relatório de execução limpo com `retries: 0`.
  * Ação: Rodar a suíte regressiva sem retries automatizados para evidenciar falhas reais de flakiness.

---

## 3. Critérios Objetivos de Reconsideração (Para um "GO Condicionado")

A liberação só poderá ser reavaliada se **TODOS** os critérios abaixo forem atingidos até às 17:30h:

1. **SLA de Convergência**: 100% das compras sintéticas com acesso liberado em $t \le 60\text{ s}$ em bateria de 200 testes concorrentes.
2. **CI Confiável**: Suíte de regressão executada sem retries com 100% de aprovação técnica.
3. **Descarte de Vazamento**: Confirmação por log e query de banco que a tentativa de wrong owner foi rejeitada pela aplicação antes do commit.
4. **Script de Reconciliação Passivo**: Script de validação e limpeza de dados (dry-run) homologado para a nova estrutura de pagamentos.

---

## 4. Plano de Monitoramento, Rollback e Reconciliação de Dados

### A. Sinais de Parada (Circuit Breakers em Produção)
Se a release for aprovada sob exceção executiva, o rollback imediato será acionado se:
* Taxa de erro de webhooks de pagamento exceder **1%** em 5 minutos.
* Tempo P95 de liberação de acesso ultrapassar **60 segundos**.
* Ocorrer **1 única ocorrência** de log referente a wrong owner / acesso cruzado de alunos.

### B. Estratégia de Rollback Diferenciada
* **Camada de Front-end**: Desativar a Feature Flag imediatamente (retorno instantâneo à interface anterior).
* **Camada de Código Backend**: Reverter imagem do container para a versão Blue/Stable.
* **Camada de Dados e Cobranças (Crucial)**:
  * Reverter o código **NÃO** cancela PIX/Cartão nem remove permissões no banco.
  * Ação financeira: Rodar script de conciliação para emitir estornos estornando no gateway os pedidos cujos acessos falharam.
  * Ação de acesso: Executar script de purge de permissões órfãs criadas durante a janela de release.
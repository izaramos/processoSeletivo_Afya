# PLANOS TÉCNICOS NÃO-FUNCIONAIS: PERFORMANCE, RESILIÊNCIA E SEGURANÇA

---

## 1. Experimento de Performance e Resiliência (Ambiente Isolado)

### A. Arquitetura do Teste de Carga
O teste deve ser executado exclusivamente em ambiente de Staging/Performance, isolado dos serviços públicos e utilizando mocks de alta performance para o Gateway de Pagamentos.

* **Volume e Concorrência**:
  * Carga progressiva: 10 $\to$ 50 $\to$ 150 requisições simultâneas por segundo (RPS) durante 15 minutos.
  * Simulação de picos de compras (ex: abertura de turma de curso).
* **Distribuição de Tráfego**:
  * 70% Cartão de Crédito (Processamento síncrono/assíncrono misto).
  * 30% PIX (Notificação via Webhook assíncrono).

### B. Métricas Chave e Critérios de Aceite

```text
[Cliente/Front] ---> (POST /checkout) ---> [Gateway Mock]
                                               │ (Webhook)
                                               ▼
[Worker Reconcile] <--- (Queue Kafka) <--- [API Receiver]
        │
        ▼
   [DB Accesses]
```
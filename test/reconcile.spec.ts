import { test, expect } from '@playwright/test';
import { reconcile, Order, Payment, Access } from '../reconcile';

test.describe('Unidade: Reconciliação Financeira e Acessos', () => {
  const baseOrder: Order = {
    id: 101,
    studentId: 50,
    courseId: 12,
    amountCents: 15000, // R$ 150,00
    status: 'CONFIRMED',
  };

  test('01. Desconsiderar pagamentos com status FAILED', async () => {
    const events: Payment[] = [
      { id: 1, eventId: 'evt_1', orderId: 101, kind: 'CAPTURE', status: 'FAILED', amountCents: 15000, receivedAt: '2026-05-01' },
      { id: 2, eventId: 'evt_2', orderId: 101, kind: 'CAPTURE', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01' },
    ];
    const result = reconcile(baseOrder, events, []);
    expect(result.capturedCents).toBe(15000);
  });

  test('02. Transição FAILED -> SUCCEEDED (Eventos de tentativa e recuperação)', async () => {
    const events: Payment[] = [
      { id: 1, eventId: 'evt_1', orderId: 101, kind: 'CAPTURE', status: 'FAILED', amountCents: 15000, receivedAt: '2026-05-01T10:00:00Z' },
      { id: 2, eventId: 'evt_2', orderId: 101, kind: 'CAPTURE', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01T10:05:00Z' },
    ];
    const result = reconcile(baseOrder, events, []);
    expect(result.capturedCents).toBe(15000);
    expect(result.shouldHaveAccess).toBe(true);
  });

  test('03. Deduplicação de Webhooks (Reentrega do mesmo eventId)', async () => {
    const events: Payment[] = [
      { id: 1, eventId: 'evt_dup', orderId: 101, kind: 'CAPTURE', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01T10:00:00Z' },
      { id: 1, eventId: 'evt_dup', orderId: 101, kind: 'CAPTURE', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01T10:00:00Z' },
    ];
    const result = reconcile(baseOrder, events, []);
    expect(result.capturedCents).toBe(15000); // Não deve somar 30000
  });

  test('04. Ignorar reembolsos FAILED ou de outros pedidos', async () => {
    const events: Payment[] = [
      { id: 1, eventId: 'evt_1', orderId: 101, kind: 'CAPTURE', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01' },
      { id: 2, eventId: 'evt_2', orderId: 999, kind: 'REFUND', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01' }, // Outro pedido
      { id: 3, eventId: 'evt_3', orderId: 101, kind: 'REFUND', status: 'FAILED', amountCents: 15000, receivedAt: '2026-05-01' },   // Falhou
    ];
    const result = reconcile(baseOrder, events, []);
    expect(result.refundedCents).toBe(0);
    expect(result.netCents).toBe(15000);
    expect(result.shouldHaveAccess).toBe(true);
  });

  test('05. Reembolso parcial mantém saldo e calcula netCents', async () => {
    const events: Payment[] = [
      { id: 1, eventId: 'evt_1', orderId: 101, kind: 'CAPTURE', status: 'SUCCEEDED', amountCents: 15000, receivedAt: '2026-05-01' },
      { id: 2, eventId: 'evt_2', orderId: 101, kind: 'REFUND', status: 'SUCCEEDED', amountCents: 5000, receivedAt: '2026-05-02' },
    ];
    const result = reconcile(baseOrder, events, []);
    expect(result.capturedCents).toBe(15000);
    expect(result.refundedCents).toBe(5000);
    expect(result.netCents).toBe(10000);
    expect(result.shouldHaveAccess).toBe(false); // Retido R$ 100 < R$ 150 exigidos
  });

  test('06. Contar activeCount isolando orderId, studentId e courseId', async () => {
    const accesses: Access[] = [
      { orderId: 101, studentId: 50, courseId: 12, status: 'ACTIVE' },  // Válido
      { orderId: 999, studentId: 50, courseId: 12, status: 'ACTIVE' },  // Outro pedido
      { orderId: 101, studentId: 50, courseId: 99, status: 'ACTIVE' },  // Outro curso
      { orderId: 101, studentId: 50, courseId: 12, status: 'REVOKED' }, // Revogado
    ];
    const result = reconcile(baseOrder, [], accesses);
    expect(result.activeCount).toBe(1);
    expect(result.duplicateAccess).toBe(false);
  });

  test('07. Identificar duplicidade de acessos (duplicateAccess)', async () => {
    const accesses: Access[] = [
      { orderId: 101, studentId: 50, courseId: 12, status: 'ACTIVE' },
      { orderId: 101, studentId: 50, courseId: 12, status: 'ACTIVE' },
    ];
    const result = reconcile(baseOrder, [], accesses);
    expect(result.activeCount).toBe(2);
    expect(result.duplicateAccess).toBe(true);
  });

  test('08. Detectar acesso pertencente a outro aluno (hasWrongOwner)', async () => {
    const accesses: Access[] = [
      { orderId: 101, studentId: 999, courseId: 12, status: 'ACTIVE' }, // ID do estudante divergente
    ];
    const result = reconcile(baseOrder, [], accesses);
    expect(result.hasWrongOwner).toBe(true);
  });
});
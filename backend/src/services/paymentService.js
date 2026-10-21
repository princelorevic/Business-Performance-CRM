import { pool, withTransaction } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { notFound, conflict, badRequest } from '../utils/errors.js';
import { toCents, fromCents, sumCents } from '../utils/money.js';
import { audit } from './auditService.js';
import { paymentsForInvoice, companyToday } from './invoiceService.js';
import { invoiceOutstanding, deriveInvoiceStatus } from './financialCalculations.js';

const SORTABLE = { paidAt: 'payments.paid_at', amount: 'payments.amount', created: 'payments.created_at' };
const map = (r) => ({
  id: r.id, direction: r.direction, kind: r.kind, invoiceId: r.invoice_id, invoiceNumber: r.invoice_number, expenseId: r.expense_id,
  refundOfPaymentId: r.refund_of_payment_id, amount: String(r.amount), method: r.method, reference: r.reference,
  paidAt: r.paid_at, status: r.status, idempotencyKey: r.idempotency_key,
});

export async function listPayments(companyId, q) {
  const extra = []; const params = [];
  if (q.direction) { extra.push('payments.direction = ?'); params.push(q.direction); }
  if (q.status) { extra.push('payments.status = ?'); params.push(q.status); }
  const res = await paginate(pool, {
    table: 'payments', columns: 'payments.*, invoices.number AS invoice_number', companyId,
    joins: 'LEFT JOIN invoices ON invoices.id = payments.invoice_id AND invoices.company_id = payments.company_id',
    extraWhere: extra.join(' AND '), extraParams: params,
    search: q.search, searchColumns: ['payments.reference', 'invoices.number'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'paidAt', page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(map) };
}

async function fetchPayment(conn, companyId, id) {
  const [rows] = await conn.execute('SELECT * FROM payments WHERE id = ? AND company_id = ?', [id, companyId]);
  return rows[0];
}

// Recompute and store the invoice status from its completed payments.
async function syncInvoiceStatus(conn, auth, invoiceId) {
  const [rows] = await conn.execute('SELECT id, total, status, due_date FROM invoices WHERE id = ? AND company_id = ?', [invoiceId, auth.companyId]);
  const invoice = rows[0];
  const payments = await paymentsForInvoice(conn, auth.companyId, invoiceId);
  const today = await companyToday(conn, auth.companyId);
  const next = deriveInvoiceStatus(invoice, payments, new Date(`${today}T00:00:00Z`));
  if (next !== invoice.status) await conn.execute('UPDATE invoices SET status = ? WHERE id = ? AND company_id = ?', [next, invoiceId, auth.companyId]);
  return next;
}

// Same key + same request returns the original record (safe retry); same key + different request is a conflict.
function replayOrConflict(existing, expected) {
  const same = Object.entries(expected).every(([k, v]) =>
    (k === 'amount' ? toCents(existing[k]) === toCents(v) : String(existing[k]) === String(v)));
  if (!same) throw conflict('Idempotency key was already used for a different request');
  return { payment: map(existing), replayed: true };
}

export async function recordPayment(auth, input, ip) {
  const expected = { invoice_id: input.invoiceId, amount: input.amount, direction: 'incoming' };
  try {
    return await withTransaction(async (conn) => {
      const [dupe] = await conn.execute('SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?', [auth.companyId, input.idempotencyKey]);
      if (dupe[0]) return replayOrConflict(dupe[0], expected);

      const [inv] = await conn.execute('SELECT id, total, status, due_date FROM invoices WHERE id = ? AND company_id = ? FOR UPDATE', [input.invoiceId, auth.companyId]);
      if (!inv[0]) throw notFound('Invoice not found');
      if (!['sent', 'partially_paid', 'overdue'].includes(inv[0].status)) throw conflict(`Cannot record a payment on a ${inv[0].status} invoice`);

      const payments = await paymentsForInvoice(conn, auth.companyId, input.invoiceId);
      const outstanding = invoiceOutstanding(inv[0], payments);
      if (toCents(input.amount) > toCents(outstanding)) throw badRequest(`Payment exceeds the outstanding balance of ${outstanding}`);

      const [r] = await conn.execute(
        `INSERT INTO payments (company_id, direction, kind, invoice_id, amount, method, reference, paid_at, status, idempotency_key, recorded_by)
         VALUES (?, 'incoming', 'payment', ?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [auth.companyId, input.invoiceId, input.amount, input.method, input.reference, input.paidAt, input.idempotencyKey, auth.userId],
      );
      const status = await syncInvoiceStatus(conn, auth, input.invoiceId);
      await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'payment.recorded', entityType: 'payment', entityId: r.insertId, details: { invoiceId: input.invoiceId, amount: input.amount, invoiceStatus: status }, ip });
      return { payment: map(await fetchPayment(conn, auth.companyId, r.insertId)), replayed: false };
    });
  } catch (err) {
    // Two concurrent requests with the same key: the loser re-reads the winner's row.
    if (err.code === 'ER_DUP_ENTRY') {
      const [dupe] = await pool.execute('SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?', [auth.companyId, input.idempotencyKey]);
      if (dupe[0]) return replayOrConflict(dupe[0], expected);
    }
    throw err;
  }
}

export async function refundPayment(auth, paymentId, input, ip) {
  try {
    return await withTransaction(async (conn) => {
      const [dupe] = await conn.execute('SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?', [auth.companyId, input.idempotencyKey]);
      if (dupe[0]) return replayOrConflict(dupe[0], { refund_of_payment_id: paymentId, amount: input.amount, direction: 'outgoing' });

      const [orig] = await conn.execute('SELECT * FROM payments WHERE id = ? AND company_id = ? FOR UPDATE', [paymentId, auth.companyId]);
      const original = orig[0];
      if (!original) throw notFound('Payment not found');
      if (original.direction !== 'incoming' || original.status !== 'completed') throw conflict('Only completed incoming payments can be refunded');
      await conn.execute('SELECT id FROM invoices WHERE id = ? AND company_id = ? FOR UPDATE', [original.invoice_id, auth.companyId]);

      const [refs] = await conn.execute("SELECT amount FROM payments WHERE company_id = ? AND refund_of_payment_id = ? AND status = 'completed'", [auth.companyId, paymentId]);
      const refundable = toCents(original.amount) - sumCents(refs.map((x) => x.amount));
      if (toCents(input.amount) > refundable) throw badRequest(`Refund exceeds the refundable amount of ${fromCents(refundable)}`);

      const [r] = await conn.execute(
        `INSERT INTO payments (company_id, direction, kind, invoice_id, refund_of_payment_id, amount, method, reference, paid_at, status, idempotency_key, recorded_by)
         VALUES (?, 'outgoing', 'refund', ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [auth.companyId, original.invoice_id, paymentId, input.amount, original.method, input.reference, input.paidAt, input.idempotencyKey, auth.userId],
      );
      const status = await syncInvoiceStatus(conn, auth, original.invoice_id);
      await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'payment.refunded', entityType: 'payment', entityId: r.insertId, details: { originalPaymentId: paymentId, amount: input.amount, reason: input.reason, invoiceStatus: status }, ip });
      return { payment: map(await fetchPayment(conn, auth.companyId, r.insertId)), replayed: false };
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const [dupe] = await pool.execute('SELECT * FROM payments WHERE company_id = ? AND idempotency_key = ?', [auth.companyId, input.idempotencyKey]);
      if (dupe[0]) return replayOrConflict(dupe[0], { refund_of_payment_id: paymentId, amount: input.amount, direction: 'outgoing' });
    }
    throw err;
  }
}

// Voiding corrects a mistaken entry (e.g. wrong invoice). Payments that were already refunded cannot be voided.
export async function voidPayment(auth, paymentId, reason, ip) {
  return withTransaction(async (conn) => {
    const p = await fetchPayment(conn, auth.companyId, paymentId);
    if (!p) throw notFound('Payment not found');
    if (p.status === 'void') throw conflict('Payment is already void');
    if (p.kind === 'payment' && p.direction === 'incoming') {
      const [refs] = await conn.execute("SELECT id FROM payments WHERE company_id = ? AND refund_of_payment_id = ? AND status = 'completed' LIMIT 1", [auth.companyId, paymentId]);
      if (refs.length) throw conflict('Void the refund(s) first');
    }
    await conn.execute("UPDATE payments SET status = 'void' WHERE id = ? AND company_id = ?", [paymentId, auth.companyId]);
    if (p.invoice_id) await syncInvoiceStatus(conn, auth, p.invoice_id);
    if (p.expense_id) await conn.execute("UPDATE expenses SET status = 'approved' WHERE id = ? AND company_id = ? AND status = 'paid'", [p.expense_id, auth.companyId]);
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'payment.voided', entityType: 'payment', entityId: paymentId, details: { reason }, ip });
    return map(await fetchPayment(conn, auth.companyId, paymentId));
  });
}

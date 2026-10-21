import { pool, withTransaction } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { assertOwned, nextNumber } from '../utils/tenant.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { todayIn } from '../utils/dates.js';
import { audit } from './auditService.js';
import { assertWithinLimit } from './subscriptionService.js';
import { invoiceOutstanding } from './financialCalculations.js';
import { toCents } from '../utils/money.js';

const SORTABLE = { number: 'invoices.number', total: 'invoices.total', issued: 'invoices.issue_date', due: 'invoices.due_date', status: 'invoices.status', created: 'invoices.created_at' };

export async function companyToday(db, companyId) {
  const [rows] = await db.execute('SELECT timezone FROM companies WHERE id = ?', [companyId]);
  return todayIn(rows[0]?.timezone);
}

// Unpaid issued invoices past their due date become overdue (company time zone).
export async function refreshOverdue(db, companyId) {
  const today = await companyToday(db, companyId);
  await db.execute(
    "UPDATE invoices SET status = 'overdue' WHERE company_id = ? AND status IN ('sent','partially_paid') AND due_date < ?",
    [companyId, today],
  );
}

export async function paymentsForInvoice(db, companyId, invoiceId) {
  const [rows] = await db.execute(
    'SELECT id, invoice_id, direction, kind, amount, status, paid_at, method, reference FROM payments WHERE company_id = ? AND invoice_id = ? ORDER BY paid_at, id',
    [companyId, invoiceId],
  );
  return rows;
}

const map = (r) => ({
  id: r.id, number: r.number, customerId: r.customer_id, customerName: r.customer_name,
  issueDate: r.issue_date, dueDate: r.due_date, total: String(r.total), status: r.status, notes: r.notes,
});

export async function listInvoices(companyId, q) {
  await refreshOverdue(pool, companyId);
  const extra = []; const params = [];
  if (q.status) { extra.push('invoices.status = ?'); params.push(q.status); }
  if (q.customerId) { extra.push('invoices.customer_id = ?'); params.push(q.customerId); }
  const res = await paginate(pool, {
    table: 'invoices', columns: 'invoices.*, customers.name AS customer_name', companyId,
    joins: 'JOIN customers ON customers.id = invoices.customer_id AND customers.company_id = invoices.company_id',
    extraWhere: extra.join(' AND '), extraParams: params,
    search: q.search, searchColumns: ['invoices.number', 'customers.name'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'created', page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(map) };
}

export async function getInvoice(companyId, id) {
  await refreshOverdue(pool, companyId);
  const [rows] = await pool.execute(
    'SELECT i.*, c.name AS customer_name FROM invoices i JOIN customers c ON c.id = i.customer_id AND c.company_id = i.company_id WHERE i.id = ? AND i.company_id = ?',
    [id, companyId],
  );
  if (!rows[0]) throw notFound('Invoice not found');
  const payments = await paymentsForInvoice(pool, companyId, id);
  return {
    ...map(rows[0]),
    outstanding: invoiceOutstanding({ id: rows[0].id, total: rows[0].total, status: rows[0].status }, payments),
    payments: payments.map((p) => ({ id: p.id, direction: p.direction, kind: p.kind, amount: String(p.amount), status: p.status, paidAt: p.paid_at, method: p.method, reference: p.reference })),
  };
}

// New invoices are always drafts. Issuing is a separate, finance-only action.
export async function createInvoice(auth, input, ip) {
  return withTransaction(async (conn) => {
    await assertWithinLimit(conn, auth.companyId, 'invoices');
    await assertOwned(conn, 'customers', input.customerId, auth.companyId, { asBadRequest: true });
    if (input.opportunityId) await assertOwned(conn, 'opportunities', input.opportunityId, auth.companyId, { asBadRequest: true });
    const number = await nextNumber(conn, auth.companyId, 'invoice', 'INV');
    const [r] = await conn.execute(
      `INSERT INTO invoices (company_id, customer_id, opportunity_id, number, issue_date, due_date, total, status, notes, sold_by, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [auth.companyId, input.customerId, input.opportunityId ?? null, number, input.issueDate, input.dueDate, input.total, input.notes, auth.userId, auth.userId],
    );
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'invoice.created', entityType: 'invoice', entityId: r.insertId, details: { number, total: input.total }, ip });
    return r.insertId;
  }).then((id) => getInvoice(auth.companyId, id));
}

export async function updateDraftInvoice(auth, id, input, ip) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT status FROM invoices WHERE id = ? AND company_id = ? FOR UPDATE', [id, auth.companyId]);
    if (!rows[0]) throw notFound('Invoice not found');
    if (rows[0].status !== 'draft') throw conflict('Only draft invoices can be edited');
    const cols = { issueDate: 'issue_date', dueDate: 'due_date', total: 'total', notes: 'notes' };
    const keys = Object.keys(input).filter((k) => cols[k]);
    await conn.execute(`UPDATE invoices SET ${keys.map((k) => `${cols[k]} = ?`).join(', ')} WHERE id = ? AND company_id = ?`, [...keys.map((k) => input[k]), id, auth.companyId]);
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'invoice.updated', entityType: 'invoice', entityId: id, details: { fields: keys }, ip });
  }).then(() => getInvoice(auth.companyId, id));
}

export async function issueInvoice(auth, id, ip) {
  const [r] = await pool.execute("UPDATE invoices SET status = 'sent' WHERE id = ? AND company_id = ? AND status = 'draft'", [id, auth.companyId]);
  if (!r.affectedRows) {
    await getInvoice(auth.companyId, id); // 404 when missing / cross-tenant
    throw conflict('Only draft invoices can be issued');
  }
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'invoice.issued', entityType: 'invoice', entityId: id, ip });
  await refreshOverdue(pool, auth.companyId);
  return getInvoice(auth.companyId, id);
}

// An invoice with money still held against it must be refunded first, so cash and revenue stay consistent.
export async function voidInvoice(auth, id, reason, ip) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT status FROM invoices WHERE id = ? AND company_id = ? FOR UPDATE', [id, auth.companyId]);
    if (!rows[0]) throw notFound('Invoice not found');
    if (rows[0].status === 'void') throw conflict('Invoice is already void');
    const payments = await paymentsForInvoice(conn, auth.companyId, id);
    const net = payments.filter((p) => p.status === 'completed').reduce((acc, p) => acc + (p.direction === 'incoming' ? 1n : -1n) * toCents(p.amount), 0n);
    if (net > 0n) throw badRequest('Refund the received payments before voiding this invoice');
    await conn.execute("UPDATE invoices SET status = 'void', voided_at = UTC_TIMESTAMP() WHERE id = ? AND company_id = ?", [id, auth.companyId]);
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'invoice.voided', entityType: 'invoice', entityId: id, details: { reason }, ip });
  }).then(() => getInvoice(auth.companyId, id));
}

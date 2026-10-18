import { pool, withTransaction } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { assertOwned, nextNumber } from '../utils/tenant.js';
import { notFound } from '../utils/errors.js';
import { audit } from './auditService.js';

const SORTABLE = { number: 'quotations.number', total: 'quotations.total', issued: 'quotations.issue_date', created: 'quotations.created_at' };
const map = (r) => ({ id: r.id, number: r.number, customerId: r.customer_id, customerName: r.customer_name, opportunityId: r.opportunity_id, issueDate: r.issue_date, validUntil: r.valid_until, total: String(r.total), status: r.status, notes: r.notes });

export async function listQuotations(companyId, q) {
  const res = await paginate(pool, {
    table: 'quotations', columns: 'quotations.*, customers.name AS customer_name', companyId,
    joins: 'JOIN customers ON customers.id = quotations.customer_id AND customers.company_id = quotations.company_id',
    extraWhere: q.status ? 'quotations.status = ?' : '', extraParams: q.status ? [q.status] : [],
    search: q.search, searchColumns: ['quotations.number', 'customers.name'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'created', page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(map) };
}

export async function createQuotation(auth, input, ip) {
  return withTransaction(async (conn) => {
    await assertOwned(conn, 'customers', input.customerId, auth.companyId, { asBadRequest: true });
    if (input.opportunityId) await assertOwned(conn, 'opportunities', input.opportunityId, auth.companyId, { asBadRequest: true });
    const number = await nextNumber(conn, auth.companyId, 'quotation', 'QUO');
    const [r] = await conn.execute(
      `INSERT INTO quotations (company_id, customer_id, opportunity_id, number, issue_date, valid_until, total, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [auth.companyId, input.customerId, input.opportunityId ?? null, number, input.issueDate, input.validUntil ?? null, input.total, input.status, input.notes, auth.userId],
    );
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'quotation.created', entityType: 'quotation', entityId: r.insertId, details: { number }, ip });
    const [rows] = await conn.execute('SELECT q.*, c.name AS customer_name FROM quotations q JOIN customers c ON c.id = q.customer_id AND c.company_id = q.company_id WHERE q.id = ? AND q.company_id = ?', [r.insertId, auth.companyId]);
    return map(rows[0]);
  });
}

export async function getQuotation(companyId, id) {
  const [rows] = await pool.execute('SELECT q.*, c.name AS customer_name FROM quotations q JOIN customers c ON c.id = q.customer_id AND c.company_id = q.company_id WHERE q.id = ? AND q.company_id = ?', [id, companyId]);
  if (!rows[0]) throw notFound('Quotation not found');
  return map(rows[0]);
}

export async function setQuotationStatus(auth, id, status, ip) {
  await getQuotation(auth.companyId, id);
  await pool.execute('UPDATE quotations SET status = ? WHERE id = ? AND company_id = ?', [status, id, auth.companyId]);
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'quotation.status', entityType: 'quotation', entityId: id, details: { status }, ip });
  return getQuotation(auth.companyId, id);
}

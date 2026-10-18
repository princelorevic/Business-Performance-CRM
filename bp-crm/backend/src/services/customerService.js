import { pool, withTransaction } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { assertOwned } from '../utils/tenant.js';
import { notFound } from '../utils/errors.js';
import { audit } from './auditService.js';
import { assertWithinLimit } from './subscriptionService.js';

const SORTABLE = { name: 'customers.name', created: 'customers.created_at', email: 'customers.email' };

const mapRow = (r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, address: r.address, notes: r.notes, ownerUserId: r.owner_user_id, createdAt: r.created_at });

export async function listCustomers(companyId, q) {
  const res = await paginate(pool, {
    table: 'customers',
    columns: 'customers.*',
    companyId,
    extraWhere: 'customers.deleted_at IS NULL',
    search: q.search,
    searchColumns: ['customers.name', 'customers.email', 'customers.phone'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'created',
    page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(mapRow) };
}

export async function getCustomer(companyId, id) {
  const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [id, companyId]);
  if (!rows[0]) throw notFound('Customer not found');
  const [[agg]] = await pool.execute(
    `SELECT COUNT(*) AS invoice_count, COALESCE(SUM(total), 0) AS billed
     FROM invoices WHERE company_id = ? AND customer_id = ? AND status IN ('sent','partially_paid','paid','overdue')`,
    [companyId, id],
  );
  return { ...mapRow(rows[0]), invoiceCount: Number(agg.invoice_count), totalBilled: String(agg.billed) };
}

export async function createCustomer(auth, input, ip) {
  return withTransaction(async (conn) => {
    await assertWithinLimit(conn, auth.companyId, 'customers');
    if (input.ownerUserId) await assertOwned(conn, 'users', input.ownerUserId, auth.companyId, { asBadRequest: true });
    const [r] = await conn.execute(
      'INSERT INTO customers (company_id, name, email, phone, address, notes, owner_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [auth.companyId, input.name, input.email, input.phone, input.address, input.notes, input.ownerUserId ?? auth.userId],
    );
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'customer.created', entityType: 'customer', entityId: r.insertId, ip });
    const [rows] = await conn.execute('SELECT * FROM customers WHERE id = ? AND company_id = ?', [r.insertId, auth.companyId]);
    return mapRow(rows[0]);
  });
}

const FIELD = { name: 'name', email: 'email', phone: 'phone', address: 'address', notes: 'notes', ownerUserId: 'owner_user_id' };

export async function updateCustomer(auth, id, input, ip) {
  return withTransaction(async (conn) => {
    const [cur] = await conn.execute('SELECT id FROM customers WHERE id = ? AND company_id = ? AND deleted_at IS NULL FOR UPDATE', [id, auth.companyId]);
    if (!cur[0]) throw notFound('Customer not found');
    if (input.ownerUserId) await assertOwned(conn, 'users', input.ownerUserId, auth.companyId, { asBadRequest: true });
    const keys = Object.keys(input).filter((k) => FIELD[k]);
    const set = keys.map((k) => `${FIELD[k]} = ?`).join(', ');
    await conn.execute(`UPDATE customers SET ${set} WHERE id = ? AND company_id = ?`, [...keys.map((k) => input[k]), id, auth.companyId]);
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'customer.updated', entityType: 'customer', entityId: id, details: { fields: keys }, ip });
    const [rows] = await conn.execute('SELECT * FROM customers WHERE id = ? AND company_id = ?', [id, auth.companyId]);
    return mapRow(rows[0]);
  });
}

// Soft delete keeps historical invoices and reports intact.
export async function deleteCustomer(auth, id, ip) {
  const [r] = await pool.execute('UPDATE customers SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [id, auth.companyId]);
  if (!r.affectedRows) throw notFound('Customer not found');
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'customer.deleted', entityType: 'customer', entityId: id, ip });
}

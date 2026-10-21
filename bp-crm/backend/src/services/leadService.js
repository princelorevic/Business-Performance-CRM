import { pool, withTransaction } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { notFound, badRequest } from '../utils/errors.js';
import { audit } from './auditService.js';
import { assertWithinLimit } from './subscriptionService.js';

const SORTABLE = { name: 'leads.name', created: 'leads.created_at', status: 'leads.status' };
const map = (r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, source: r.source, status: r.status, convertedCustomerId: r.converted_customer_id, createdAt: r.created_at });

export async function listLeads(companyId, q) {
  const res = await paginate(pool, {
    table: 'leads', columns: 'leads.*', companyId,
    extraWhere: q.status ? 'leads.status = ?' : '', extraParams: q.status ? [q.status] : [],
    search: q.search, searchColumns: ['leads.name', 'leads.email', 'leads.source'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'created', page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(map) };
}

export async function createLead(auth, input, ip) {
  const [r] = await pool.execute(
    'INSERT INTO leads (company_id, name, email, phone, source, status, owner_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [auth.companyId, input.name, input.email, input.phone, input.source, input.status === 'converted' ? 'new' : input.status, auth.userId],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'lead.created', entityType: 'lead', entityId: r.insertId, ip });
  return getLead(auth.companyId, r.insertId);
}

export async function getLead(companyId, id) {
  const [rows] = await pool.execute('SELECT * FROM leads WHERE id = ? AND company_id = ?', [id, companyId]);
  if (!rows[0]) throw notFound('Lead not found');
  return map(rows[0]);
}

export async function updateLead(auth, id, input, ip) {
  await getLead(auth.companyId, id);
  if (input.status === 'converted') throw badRequest('Use the convert action to convert a lead');
  const cols = { name: 'name', email: 'email', phone: 'phone', source: 'source', status: 'status' };
  const keys = Object.keys(input).filter((k) => cols[k]);
  await pool.execute(`UPDATE leads SET ${keys.map((k) => `${cols[k]} = ?`).join(', ')} WHERE id = ? AND company_id = ?`, [...keys.map((k) => input[k]), id, auth.companyId]);
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'lead.updated', entityType: 'lead', entityId: id, details: { fields: keys }, ip });
  return getLead(auth.companyId, id);
}

// Converting creates a customer and marks the lead converted atomically.
export async function convertLead(auth, id, ip) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM leads WHERE id = ? AND company_id = ? FOR UPDATE', [id, auth.companyId]);
    const lead = rows[0];
    if (!lead) throw notFound('Lead not found');
    if (lead.status === 'converted') throw badRequest('Lead is already converted');
    await assertWithinLimit(conn, auth.companyId, 'customers');
    const [c] = await conn.execute(
      'INSERT INTO customers (company_id, name, email, phone, owner_user_id) VALUES (?, ?, ?, ?, ?)',
      [auth.companyId, lead.name, lead.email, lead.phone, auth.userId],
    );
    await conn.execute("UPDATE leads SET status = 'converted', converted_customer_id = ? WHERE id = ? AND company_id = ?", [c.insertId, id, auth.companyId]);
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'lead.converted', entityType: 'lead', entityId: id, details: { customerId: c.insertId }, ip });
    return { leadId: id, customerId: c.insertId };
  });
}

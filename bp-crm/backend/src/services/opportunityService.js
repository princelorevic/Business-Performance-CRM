import { pool } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { assertOwned } from '../utils/tenant.js';
import { notFound } from '../utils/errors.js';
import { audit } from './auditService.js';

const SORTABLE = { title: 'opportunities.title', value: 'opportunities.value', created: 'opportunities.created_at', stage: 'opportunities.stage' };
const map = (r) => ({ id: r.id, customerId: r.customer_id, customerName: r.customer_name, title: r.title, stage: r.stage, value: String(r.value), expectedCloseDate: r.expected_close_date, closedAt: r.closed_at, createdAt: r.created_at });

export async function listOpportunities(companyId, q) {
  const res = await paginate(pool, {
    table: 'opportunities', columns: 'opportunities.*, customers.name AS customer_name', companyId,
    joins: 'JOIN customers ON customers.id = opportunities.customer_id AND customers.company_id = opportunities.company_id',
    extraWhere: q.stage ? 'opportunities.stage = ?' : '', extraParams: q.stage ? [q.stage] : [],
    search: q.search, searchColumns: ['opportunities.title', 'customers.name'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'created', page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(map) };
}

export async function getOpportunity(companyId, id) {
  const [rows] = await pool.execute(
    `SELECT o.*, c.name AS customer_name FROM opportunities o JOIN customers c ON c.id = o.customer_id AND c.company_id = o.company_id
     WHERE o.id = ? AND o.company_id = ?`, [id, companyId]);
  if (!rows[0]) throw notFound('Opportunity not found');
  return map(rows[0]);
}

export async function createOpportunity(auth, input, ip) {
  await assertOwned(pool, 'customers', input.customerId, auth.companyId, { asBadRequest: true });
  const closed = ['won', 'lost'].includes(input.stage);
  const [r] = await pool.execute(
    `INSERT INTO opportunities (company_id, customer_id, title, stage, value, expected_close_date, owner_user_id, closed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ${closed ? 'UTC_TIMESTAMP()' : 'NULL'})`,
    [auth.companyId, input.customerId, input.title, input.stage, input.value, input.expectedCloseDate ?? null, auth.userId],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'opportunity.created', entityType: 'opportunity', entityId: r.insertId, ip });
  return getOpportunity(auth.companyId, r.insertId);
}

export async function updateOpportunity(auth, id, input, ip) {
  await getOpportunity(auth.companyId, id);
  const cols = { title: 'title', stage: 'stage', value: 'value', expectedCloseDate: 'expected_close_date' };
  const keys = Object.keys(input).filter((k) => cols[k]);
  const closedSql = input.stage ? (['won', 'lost'].includes(input.stage) ? ', closed_at = COALESCE(closed_at, UTC_TIMESTAMP())' : ', closed_at = NULL') : '';
  await pool.execute(`UPDATE opportunities SET ${keys.map((k) => `${cols[k]} = ?`).join(', ')}${closedSql} WHERE id = ? AND company_id = ?`, [...keys.map((k) => input[k] ?? null), id, auth.companyId]);
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'opportunity.updated', entityType: 'opportunity', entityId: id, details: { fields: keys }, ip });
  return getOpportunity(auth.companyId, id);
}

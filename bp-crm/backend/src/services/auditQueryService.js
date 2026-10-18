import { pool } from '../db/pool.js';
import { FINANCIAL_ENTITIES } from './auditService.js';

// CEO/COO sees everything; Finance sees financial entities only.
export async function listAudit(companyId, q, { financialOnly }) {
  const where = ['a.company_id = ?']; const params = [companyId];
  if (financialOnly) { where.push(`a.entity_type IN (${FINANCIAL_ENTITIES.map(() => '?').join(',')})`); params.push(...FINANCIAL_ENTITIES); }
  if (q.entityType) { where.push('a.entity_type = ?'); params.push(q.entityType); }
  if (q.from) { where.push('a.created_at >= ?'); params.push(q.from); }
  if (q.to) { where.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(q.to); }
  const w = where.join(' AND ');
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs a WHERE ${w}`, params);
  const [rows] = await pool.query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, u.full_name AS user_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id AND u.company_id = a.company_id
     WHERE ${w} ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    [...params, q.pageSize, (q.page - 1) * q.pageSize],
  );
  return {
    data: rows.map((r) => ({ id: r.id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details, userName: r.user_name, createdAt: r.created_at })),
    page: q.page, pageSize: q.pageSize, total: Number(total), totalPages: Math.max(1, Math.ceil(Number(total) / q.pageSize)),
  };
}

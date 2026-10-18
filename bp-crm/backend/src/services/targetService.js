import { pool } from '../db/pool.js';
import { assertOwned } from '../utils/tenant.js';
import { audit } from './auditService.js';
import { targetAchievement } from './financialCalculations.js';
import { sumCents, fromCents } from '../utils/money.js';

export async function createTarget(auth, input, ip) {
  if (input.userId) await assertOwned(pool, 'users', input.userId, auth.companyId, { asBadRequest: true });
  const [r] = await pool.execute(
    'INSERT INTO sales_targets (company_id, user_id, period_start, period_end, amount) VALUES (?, ?, ?, ?, ?)',
    [auth.companyId, input.userId ?? null, input.periodStart, input.periodEnd, input.amount],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'target.created', entityType: 'sales_target', entityId: r.insertId, details: input, ip });
  return { id: r.insertId };
}

// Actual = recognized invoice totals issued in the target's own period (by seller for personal targets).
export async function listTargetsWithProgress(companyId, { onlyUserId = null, coveringDate = null } = {}) {
  const where = ['t.company_id = ?']; const params = [companyId];
  if (onlyUserId) { where.push('t.user_id = ?'); params.push(onlyUserId); }
  if (coveringDate) { where.push('t.period_start <= ? AND t.period_end >= ?'); params.push(coveringDate, coveringDate); }
  const [targets] = await pool.execute(`SELECT t.*, u.full_name FROM sales_targets t LEFT JOIN users u ON u.id = t.user_id AND u.company_id = t.company_id WHERE ${where.join(' AND ')} ORDER BY t.period_start DESC`, params);
  const out = [];
  for (const t of targets) {
    const sellerSql = t.user_id ? 'AND sold_by = ?' : '';
    const p = [companyId, t.period_start, t.period_end, ...(t.user_id ? [t.user_id] : [])];
    const [inv] = await pool.execute(`SELECT total FROM invoices WHERE company_id = ? AND issue_date BETWEEN ? AND ? AND status IN ('sent','partially_paid','paid','overdue') ${sellerSql}`, p);
    const actual = fromCents(sumCents(inv.map((i) => i.total)));
    out.push({ id: t.id, userId: t.user_id, userName: t.full_name, periodStart: t.period_start, periodEnd: t.period_end, target: String(t.amount), actual, achievement: targetAchievement(actual, t.amount) });
  }
  return out;
}

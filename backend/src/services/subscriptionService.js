import { pool } from '../db/pool.js';
import { audit } from './auditService.js';
import { effectiveStatus, canTransition } from './subscriptionRules.js';
import { limitReached, badRequest, notFound } from '../utils/errors.js';

const LIMIT_COLUMN = { users: 'max_users', customers: 'max_customers', invoices: 'max_invoices_per_month' };

const USAGE_SQL = {
  users: "SELECT COUNT(*) AS n FROM users WHERE company_id = ? AND status = 'active'",
  customers: 'SELECT COUNT(*) AS n FROM customers WHERE company_id = ? AND deleted_at IS NULL',
  invoices: `SELECT COUNT(*) AS n FROM invoices WHERE company_id = ? AND status <> 'void'
             AND issue_date >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')`,
};

export async function getUsage(db, companyId) {
  const out = {};
  for (const [key, sql] of Object.entries(USAGE_SQL)) {
    const [rows] = await db.execute(sql, [companyId]);
    out[key] = Number(rows[0].n);
  }
  return out;
}

export async function assertWithinLimit(db, companyId, resource) {
  const [rows] = await db.execute(
    `SELECT p.${LIMIT_COLUMN[resource]} AS lim FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.company_id = ?`,
    [companyId],
  );
  const limit = rows[0]?.lim;
  if (limit === null || limit === undefined) return; // unlimited
  const usage = (await db.execute(USAGE_SQL[resource], [companyId]))[0][0].n;
  if (Number(usage) >= limit) {
    throw limitReached(`Your plan allows up to ${limit} ${resource}. Upgrade to add more.`);
  }
}

export async function getSubscription(companyId) {
  const [rows] = await pool.execute(
    `SELECT s.*, p.code AS plan_code, p.name AS plan_name, p.max_users, p.max_customers, p.max_invoices_per_month, p.features
     FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.company_id = ?`,
    [companyId],
  );
  const s = rows[0];
  if (!s) throw notFound('Subscription not found');
  const usage = await getUsage(pool, companyId);
  return {
    plan: { code: s.plan_code, name: s.plan_name },
    status: effectiveStatus(s),
    storedStatus: s.status,
    trialEndsAt: s.trial_ends_at,
    currentPeriodStart: s.current_period_start,
    currentPeriodEnd: s.current_period_end,
    renewsAt: s.renews_at,
    limits: { users: s.max_users, customers: s.max_customers, invoicesPerMonth: s.max_invoices_per_month },
    features: typeof s.features === 'string' ? JSON.parse(s.features) : s.features,
    usage,
    note: 'No payment gateway is connected. Status changes are manual and audited.',
  };
}

export async function transition(auth, to, ip) {
  const [rows] = await pool.execute('SELECT status, trial_ends_at FROM subscriptions WHERE company_id = ?', [auth.companyId]);
  if (!rows[0]) throw notFound('Subscription not found');
  const from = effectiveStatus(rows[0]);
  if (!canTransition(from, to)) throw badRequest(`Cannot move subscription from ${from} to ${to}`);
  const renew = to === 'active' ? "DATE_ADD(UTC_DATE(), INTERVAL 1 MONTH)" : 'renews_at';
  await pool.execute(
    `UPDATE subscriptions SET status = ?, renews_at = ${renew},
       current_period_start = IF(? = 'active', UTC_DATE(), current_period_start),
       current_period_end = IF(? = 'active', DATE_ADD(UTC_DATE(), INTERVAL 1 MONTH), current_period_end),
       canceled_at = IF(? = 'canceled', UTC_TIMESTAMP(), canceled_at)
     WHERE company_id = ?`,
    [to, to, to, to, auth.companyId],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'subscription.transition', entityType: 'subscription', details: { from, to, paymentProcessed: false }, ip });
  return getSubscription(auth.companyId);
}

export async function changePlan(auth, planCode, ip) {
  const [plans] = await pool.execute('SELECT * FROM plans WHERE code = ? AND is_active = 1', [planCode]);
  const plan = plans[0];
  if (!plan) throw notFound('Plan not found');
  const usage = await getUsage(pool, auth.companyId);
  const over = [
    ['users', plan.max_users], ['customers', plan.max_customers], ['invoices', plan.max_invoices_per_month],
  ].filter(([k, lim]) => lim !== null && usage[k] > lim).map(([k]) => k);
  if (over.length) throw badRequest(`Current usage exceeds the ${plan.name} plan limits for: ${over.join(', ')}`);
  await pool.execute('UPDATE subscriptions SET plan_id = ? WHERE company_id = ?', [plan.id, auth.companyId]);
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'subscription.plan_changed', entityType: 'subscription', details: { plan: planCode }, ip });
  return getSubscription(auth.companyId);
}

export async function listPlans() {
  const [rows] = await pool.execute('SELECT code, name, max_users, max_customers, max_invoices_per_month, features FROM plans WHERE is_active = 1 ORDER BY id');
  return rows;
}

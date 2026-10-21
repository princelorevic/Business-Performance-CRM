import { pool } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paymentRequired } from '../utils/errors.js';
import { effectiveStatus, WRITABLE_STATUSES } from '../services/subscriptionRules.js';

// Inactive subscriptions are read-only: data stays visible, changes are blocked.
export const subscriptionGuard = asyncHandler(async (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const [rows] = await pool.execute('SELECT status, trial_ends_at FROM subscriptions WHERE company_id = ?', [req.auth.companyId]);
  const status = effectiveStatus(rows[0]);
  if (!WRITABLE_STATUSES.includes(status)) {
    throw paymentRequired(`Subscription is ${status}. The workspace is read-only until it is reactivated.`);
  }
  next();
});

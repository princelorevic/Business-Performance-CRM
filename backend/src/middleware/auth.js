import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { can } from '../config/permissions.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const COOKIE_NAME = 'bp_session';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), tv: user.token_version }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

// Identity and company come ONLY from the verified token + database row,
// never from the request body, query or headers.
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('Session expired');
  }
  const [rows] = await pool.execute(
    'SELECT id, company_id, email, full_name, role, is_owner, status, token_version FROM users WHERE id = ?',
    [payload.sub],
  );
  const user = rows[0];
  if (!user || user.status !== 'active' || user.token_version !== payload.tv) throw unauthorized('Session expired');
  req.auth = {
    userId: user.id,
    companyId: user.company_id,
    role: user.role,
    isOwner: Boolean(user.is_owner),
    email: user.email,
    fullName: user.full_name,
  };
  next();
});

export const requirePermission = (...permissions) => (req, _res, next) => {
  if (!req.auth) return next(unauthorized());
  if (!permissions.some((p) => can(req.auth.role, p))) return next(forbidden());
  next();
};

// CSRF defence for cookie auth: browsers cannot add this header cross-site without CORS approval.
export function requireCsrfHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'bp-crm') return next(forbidden('Missing CSRF header'));
  next();
}

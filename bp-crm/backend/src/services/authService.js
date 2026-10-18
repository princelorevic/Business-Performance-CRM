import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db/pool.js';
import { env } from '../config/env.js';
import { audit } from './auditService.js';
import { signToken } from '../middleware/auth.js';
import { conflict, unauthorized, forbidden, notFound } from '../utils/errors.js';
import { assertWithinLimit } from './subscriptionService.js';

// Precomputed hash so unknown emails cost the same as wrong passwords (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_ROUNDS);

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  role: u.role,
  isOwner: Boolean(u.is_owner),
  companyId: u.company_id,
});

export async function registerCompany(input, ip) {
  const hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  return withTransaction(async (conn) => {
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [input.email]);
    if (existing.length) throw conflict('An account with this email already exists');

    const [co] = await conn.execute('INSERT INTO companies (name, currency, timezone) VALUES (?, ?, ?)', [
      input.companyName, input.currency, input.timezone,
    ]);
    const companyId = co.insertId;

    const [plans] = await conn.execute("SELECT id FROM plans WHERE code = 'starter'");
    // Trial is a real state with an end date; it never pretends to be a paid/active plan.
    await conn.execute(
      `INSERT INTO subscriptions (company_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
       VALUES (?, ?, 'trialing', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 14 DAY), UTC_DATE(), DATE_ADD(UTC_DATE(), INTERVAL 14 DAY))`,
      [companyId, plans[0].id],
    );

    const [u] = await conn.execute(
      `INSERT INTO users (company_id, email, password_hash, full_name, role, is_owner)
       VALUES (?, ?, ?, ?, 'ceo_coo', 1)`,
      [companyId, input.email, hash, input.fullName],
    );
    await audit(conn, { companyId, userId: u.insertId, action: 'company.created', entityType: 'company', entityId: companyId, details: { name: input.companyName }, ip });
    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ?', [u.insertId]);
    return rows[0];
  });
}

export async function login({ email, password }, ip) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok || user.status !== 'active') {
    if (user) await audit(null, { companyId: user.company_id, userId: user.id, action: 'auth.login_failed', entityType: 'user', entityId: user.id, ip });
    throw unauthorized('Invalid email or password');
  }
  await pool.execute('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
  await audit(null, { companyId: user.company_id, userId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, ip });
  return { user, token: signToken(user) };
}

// Bumping token_version invalidates every issued token for that user.
export async function logoutEverywhere(auth, ip) {
  await pool.execute('UPDATE users SET token_version = token_version + 1 WHERE id = ? AND company_id = ?', [auth.userId, auth.companyId]);
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'auth.logout_all', entityType: 'user', entityId: auth.userId, ip });
}

export async function listUsers(companyId) {
  const [rows] = await pool.execute(
    'SELECT id, company_id, email, full_name, role, is_owner, status, last_login_at, created_at FROM users WHERE company_id = ? ORDER BY created_at',
    [companyId],
  );
  return rows.map((u) => ({ ...publicUser(u), status: u.status, lastLoginAt: u.last_login_at, createdAt: u.created_at }));
}

export async function createUser(auth, input, ip) {
  const hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  return withTransaction(async (conn) => {
    await assertWithinLimit(conn, auth.companyId, 'users');
    const [dupe] = await conn.execute('SELECT id FROM users WHERE email = ?', [input.email]);
    if (dupe.length) throw conflict('An account with this email already exists');
    const [r] = await conn.execute(
      'INSERT INTO users (company_id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [auth.companyId, input.email, hash, input.fullName, input.role],
    );
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'user.created', entityType: 'user', entityId: r.insertId, details: { role: input.role, email: input.email }, ip });
    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? AND company_id = ?', [r.insertId, auth.companyId]);
    return publicUser(rows[0]);
  });
}

export async function updateUser(auth, targetId, changes, ip) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM users WHERE id = ? AND company_id = ? FOR UPDATE', [targetId, auth.companyId]);
    const target = rows[0];
    if (!target) throw notFound('User not found');
    if (target.is_owner) throw forbidden('The company owner cannot be changed');
    if (target.id === auth.userId) throw forbidden('You cannot change your own role or status');
    const role = changes.role ?? target.role;
    const status = changes.status ?? target.status;
    // Role/status changes revoke existing sessions so new permissions apply immediately.
    await conn.execute(
      'UPDATE users SET role = ?, status = ?, token_version = token_version + 1 WHERE id = ? AND company_id = ?',
      [role, status, targetId, auth.companyId],
    );
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'user.updated', entityType: 'user', entityId: targetId, details: { from: { role: target.role, status: target.status }, to: { role, status } }, ip });
    return { id: targetId, role, status };
  });
}

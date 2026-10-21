import * as auth from '../services/authService.js';
import { COOKIE_NAME } from '../middleware/auth.js';
import { isProd } from '../config/env.js';
import { getSubscription } from '../services/subscriptionService.js';
import { pool } from '../db/pool.js';
import { PERMISSIONS } from '../config/permissions.js';

const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 8 * 3600 * 1000 };

export async function register(req, res) {
  const user = await auth.registerCompany(req.body, req.ip);
  const { token } = await auth.login({ email: req.body.email, password: req.body.password }, req.ip);
  res.cookie(COOKIE_NAME, token, cookieOpts);
  res.status(201).json({ user: auth.publicUser(user) });
}

export async function login(req, res) {
  const { user, token } = await auth.login(req.body, req.ip);
  res.cookie(COOKIE_NAME, token, cookieOpts);
  res.json({ user: auth.publicUser(user) });
}

export function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
}

export async function logoutAll(req, res) {
  await auth.logoutEverywhere(req.auth, req.ip);
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
}

export async function me(req, res) {
  const [rows] = await pool.execute('SELECT name, currency, timezone FROM companies WHERE id = ?', [req.auth.companyId]);
  const sub = await getSubscription(req.auth.companyId);
  res.json({
    user: { id: req.auth.userId, email: req.auth.email, fullName: req.auth.fullName, role: req.auth.role, isOwner: req.auth.isOwner },
    company: { id: req.auth.companyId, ...rows[0] },
    permissions: [...PERMISSIONS[req.auth.role]],
    subscription: { status: sub.status, plan: sub.plan, trialEndsAt: sub.trialEndsAt },
  });
}

export const users = async (req, res) => res.json({ data: await auth.listUsers(req.auth.companyId) });
export const addUser = async (req, res) => res.status(201).json(await auth.createUser(req.auth, req.body, req.ip));
export const editUser = async (req, res) => res.json(await auth.updateUser(req.auth, req.params.id, req.body, req.ip));

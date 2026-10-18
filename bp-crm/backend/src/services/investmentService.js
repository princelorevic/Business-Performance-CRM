import { pool } from '../db/pool.js';
import { notFound } from '../utils/errors.js';
import { audit } from './auditService.js';
import { investmentRoi, portfolioRoi } from './financialCalculations.js';

export async function listInvestments(companyId, asOf) {
  const [inv] = await pool.execute(
    'SELECT id, name, category, purpose, amount, invested_at FROM investments WHERE company_id = ? AND invested_at <= ? ORDER BY invested_at DESC, id DESC',
    [companyId, asOf],
  );
  const [ret] = await pool.execute(
    'SELECT id, investment_id, amount, returned_at, note FROM investment_returns WHERE company_id = ? AND returned_at <= ? ORDER BY returned_at',
    [companyId, asOf],
  );
  const rows = inv.map((i) => {
    const r = investmentRoi({ id: i.id, amount: i.amount }, ret);
    return { id: i.id, name: i.name, category: i.category, purpose: i.purpose, investedAt: i.invested_at, ...r, returns: ret.filter((x) => x.investment_id === i.id).map((x) => ({ id: x.id, amount: String(x.amount), returnedAt: x.returned_at, note: x.note })) };
  });
  return {
    asOf,
    basis: 'Cumulative: investments made and returns recorded up to the as-of date.',
    portfolio: portfolioRoi(inv.map((i) => ({ id: i.id, amount: i.amount })), ret),
    investments: rows,
  };
}

export async function createInvestment(auth, input, ip) {
  const [r] = await pool.execute(
    'INSERT INTO investments (company_id, name, category, purpose, amount, invested_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [auth.companyId, input.name, input.category, input.purpose, input.amount, input.investedAt, auth.userId],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'investment.created', entityType: 'investment', entityId: r.insertId, details: { amount: input.amount }, ip });
  return { id: r.insertId };
}

// Returns must be explicitly attributed to one investment; revenue is never auto-attributed.
export async function addReturn(auth, investmentId, input, ip) {
  const [rows] = await pool.execute('SELECT id FROM investments WHERE id = ? AND company_id = ?', [investmentId, auth.companyId]);
  if (!rows[0]) throw notFound('Investment not found');
  const [r] = await pool.execute(
    'INSERT INTO investment_returns (company_id, investment_id, amount, returned_at, note, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [auth.companyId, investmentId, input.amount, input.returnedAt, input.note, auth.userId],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'investment_return.created', entityType: 'investment_return', entityId: r.insertId, details: { investmentId, amount: input.amount }, ip });
  return { id: r.insertId };
}

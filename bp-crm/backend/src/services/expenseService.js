import { pool, withTransaction } from '../db/pool.js';
import { paginate } from '../utils/listQuery.js';
import { assertOwned } from '../utils/tenant.js';
import { notFound, conflict } from '../utils/errors.js';
import { audit } from './auditService.js';

const SORTABLE = { date: 'expenses.expense_date', amount: 'expenses.amount', created: 'expenses.created_at', status: 'expenses.status' };
const map = (r) => ({ id: r.id, categoryId: r.category_id, categoryName: r.category_name, description: r.description, vendor: r.vendor, amount: String(r.amount), expenseDate: r.expense_date, status: r.status });

export async function listCategories(companyId) {
  const [rows] = await pool.execute('SELECT id, name FROM expense_categories WHERE company_id = ? ORDER BY name', [companyId]);
  return rows;
}

export async function createCategory(auth, name, ip) {
  try {
    const [r] = await pool.execute('INSERT INTO expense_categories (company_id, name) VALUES (?, ?)', [auth.companyId, name]);
    await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'expense_category.created', entityType: 'expense_category', entityId: r.insertId, ip });
    return { id: r.insertId, name };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw conflict('Category already exists');
    throw err;
  }
}

export async function listExpenses(companyId, q) {
  const extra = []; const params = [];
  if (q.status) { extra.push('expenses.status = ?'); params.push(q.status); }
  if (q.categoryId) { extra.push('expenses.category_id = ?'); params.push(q.categoryId); }
  const res = await paginate(pool, {
    table: 'expenses', columns: 'expenses.*, expense_categories.name AS category_name', companyId,
    joins: 'JOIN expense_categories ON expense_categories.id = expenses.category_id AND expense_categories.company_id = expenses.company_id',
    extraWhere: extra.join(' AND '), extraParams: params,
    search: q.search, searchColumns: ['expenses.description', 'expenses.vendor'],
    sort: q.sort, order: q.order, sortable: SORTABLE, defaultSort: 'date', page: q.page, pageSize: q.pageSize,
  });
  return { ...res, data: res.data.map(map) };
}

export async function getExpense(companyId, id) {
  const [rows] = await pool.execute(
    'SELECT e.*, c.name AS category_name FROM expenses e JOIN expense_categories c ON c.id = e.category_id AND c.company_id = e.company_id WHERE e.id = ? AND e.company_id = ?',
    [id, companyId],
  );
  if (!rows[0]) throw notFound('Expense not found');
  return map(rows[0]);
}

export async function createExpense(auth, input, ip) {
  await assertOwned(pool, 'expense_categories', input.categoryId, auth.companyId, { asBadRequest: true });
  const [r] = await pool.execute(
    "INSERT INTO expenses (company_id, category_id, description, vendor, amount, expense_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)",
    [auth.companyId, input.categoryId, input.description, input.vendor, input.amount, input.expenseDate, auth.userId],
  );
  await audit(null, { companyId: auth.companyId, userId: auth.userId, action: 'expense.created', entityType: 'expense', entityId: r.insertId, details: { amount: input.amount }, ip });
  return getExpense(auth.companyId, r.insertId);
}

const FLOW = { approve: ['draft', 'approved'], void: ['draft', 'approved'] };

export async function changeExpenseStatus(auth, id, action, ip) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT status FROM expenses WHERE id = ? AND company_id = ? FOR UPDATE', [id, auth.companyId]);
    if (!rows[0]) throw notFound('Expense not found');
    if (!FLOW[action].includes(rows[0].status)) throw conflict(`Cannot ${action} an expense that is ${rows[0].status}`);
    const next = action === 'approve' ? 'approved' : 'void';
    await conn.execute('UPDATE expenses SET status = ? WHERE id = ? AND company_id = ?', [next, id, auth.companyId]);
    await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: `expense.${action}`, entityType: 'expense', entityId: id, ip });
  }).then(() => getExpense(auth.companyId, id));
}

// Paying an expense creates the outgoing cash record and marks the expense paid atomically.
export async function payExpense(auth, id, input, ip) {
  try {
    return await withTransaction(async (conn) => {
      const [dupe] = await conn.execute('SELECT id, expense_id FROM payments WHERE company_id = ? AND idempotency_key = ?', [auth.companyId, input.idempotencyKey]);
      if (dupe[0]) {
        if (dupe[0].expense_id !== id) throw conflict('Idempotency key was already used for a different request');
        return { expense: await getExpense(auth.companyId, id), replayed: true };
      }
      const [rows] = await conn.execute('SELECT status, amount FROM expenses WHERE id = ? AND company_id = ? FOR UPDATE', [id, auth.companyId]);
      if (!rows[0]) throw notFound('Expense not found');
      if (rows[0].status !== 'approved') throw conflict('Only approved expenses can be paid');
      const [r] = await conn.execute(
        `INSERT INTO payments (company_id, direction, kind, expense_id, amount, method, reference, paid_at, status, idempotency_key, recorded_by)
         VALUES (?, 'outgoing', 'payment', ?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [auth.companyId, id, rows[0].amount, input.method, input.reference, input.paidAt, input.idempotencyKey, auth.userId],
      );
      await conn.execute("UPDATE expenses SET status = 'paid' WHERE id = ? AND company_id = ?", [id, auth.companyId]);
      await audit(conn, { companyId: auth.companyId, userId: auth.userId, action: 'expense.paid', entityType: 'expense', entityId: id, details: { paymentId: r.insertId, amount: String(rows[0].amount) }, ip });
      return { expense: await getExpense(auth.companyId, id), replayed: false };
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw conflict('Duplicate payment attempt');
    throw err;
  }
}

import { pool } from '../db/pool.js';
import { previousPeriod, totalReceivables, invoiceOutstanding } from './financialCalculations.js';
import { buildFinancialSummary } from './summaryBuilder.js';
import { companyToday, refreshOverdue } from './invoiceService.js';
import { listTargetsWithProgress } from './targetService.js';
import { listInvestments } from './investmentService.js';
import { sumCents, fromCents, percentage } from '../utils/money.js';

async function fetchPeriod(companyId, from, to) {
  const [invoices] = await pool.execute(
    `SELECT i.id, i.number, i.total, i.status, i.issue_date, i.customer_id, c.name AS customer_name
     FROM invoices i JOIN customers c ON c.id = i.customer_id AND c.company_id = i.company_id
     WHERE i.company_id = ? AND i.issue_date BETWEEN ? AND ? ORDER BY i.issue_date, i.id`,
    [companyId, from, to],
  );
  const [payments] = await pool.execute(
    `SELECT id, direction, kind, amount, status, paid_at, invoice_id, expense_id FROM payments
     WHERE company_id = ? AND paid_at BETWEEN ? AND ? ORDER BY paid_at, id`,
    [companyId, from, to],
  );
  const [expenses] = await pool.execute(
    `SELECT e.id, e.description, e.vendor, e.amount, e.status, e.expense_date, k.name AS category_name
     FROM expenses e JOIN expense_categories k ON k.id = e.category_id AND k.company_id = e.company_id
     WHERE e.company_id = ? AND e.expense_date BETWEEN ? AND ? ORDER BY e.expense_date, e.id`,
    [companyId, from, to],
  );
  return { invoices, payments, expenses, refunds: payments.filter((p) => p.kind === 'refund') };
}

async function openReceivables(companyId, today) {
  const [invoices] = await pool.execute(
    "SELECT id, number, total, status, due_date, customer_id FROM invoices WHERE company_id = ? AND status IN ('sent','partially_paid','overdue')",
    [companyId],
  );
  const ids = invoices.map((i) => i.id);
  let payments = [];
  if (ids.length) {
    [payments] = await pool.query('SELECT invoice_id, direction, amount, status FROM payments WHERE company_id = ? AND invoice_id IN (?)', [companyId, ids]);
  }
  const overdueInvoices = invoices
    .filter((i) => i.due_date < today)
    .map((i) => ({ ...i, outstanding: invoiceOutstanding(i, payments) }))
    .filter((i) => i.outstanding !== '0.00');
  return { openInvoices: invoices, invoicePayments: payments, overdueInvoices };
}

export async function getFinancialSummary(companyId, from, to) {
  await refreshOverdue(pool, companyId);
  const prev = previousPeriod(from, to);
  const [data, prevData, today] = await Promise.all([
    fetchPeriod(companyId, from, to),
    fetchPeriod(companyId, prev.from, prev.to),
    companyToday(pool, companyId),
  ]);
  const ctx = { from, to, ...(await openReceivables(companyId, today)) };
  return { range: { from, to }, previousRange: prev, ...buildFinancialSummary(data, prevData, ctx) };
}

export async function getSalesSummary(auth, from, to, { personal = false } = {}) {
  const companyId = auth.companyId;
  const sellerSql = personal ? 'AND sold_by = ?' : '';
  const sp = personal ? [auth.userId] : [];
  const [inv] = await pool.execute(
    `SELECT total FROM invoices WHERE company_id = ? AND issue_date BETWEEN ? AND ? AND status IN ('sent','partially_paid','paid','overdue') ${sellerSql}`,
    [companyId, from, to, ...sp],
  );
  const [stages] = await pool.execute(
    `SELECT stage, COUNT(*) AS n, COALESCE(SUM(value), 0) AS value FROM opportunities WHERE company_id = ? ${personal ? 'AND owner_user_id = ?' : ''} GROUP BY stage`,
    [companyId, ...sp],
  );
  const [closed] = await pool.execute(
    `SELECT stage, COUNT(*) AS n FROM opportunities WHERE company_id = ? AND stage IN ('won','lost') AND closed_at >= ? AND closed_at < DATE_ADD(?, INTERVAL 1 DAY) ${personal ? 'AND owner_user_id = ?' : ''} GROUP BY stage`,
    [companyId, from, to, ...sp],
  );
  const won = Number(closed.find((c) => c.stage === 'won')?.n ?? 0);
  const lost = Number(closed.find((c) => c.stage === 'lost')?.n ?? 0);
  const open = stages.filter((s) => !['won', 'lost'].includes(s.stage));
  const today = await companyToday(pool, companyId);
  return {
    range: { from, to },
    salesTotal: fromCents(sumCents(inv.map((i) => i.total))),
    invoiceCount: inv.length,
    pipelineValue: fromCents(sumCents(open.map((s) => s.value))),
    pipelineByStage: stages.map((s) => ({ stage: s.stage, count: Number(s.n), value: String(s.value) })),
    closedWon: won,
    closedLost: lost,
    conversionRate: won + lost > 0 ? percentage(String(won), String(won + lost)) : null, // percent of closed deals that were won; null when none closed
    targets: await listTargetsWithProgress(companyId, { onlyUserId: personal ? auth.userId : null, coveringDate: to > today ? today : to }),
  };
}

export async function getDashboard(auth, from, to, can) {
  const out = { range: { from, to }, role: auth.role };
  if (can('reports:financial')) {
    out.financial = await getFinancialSummary(auth.companyId, from, to);
    out.roi = can('investments:read') ? (await listInvestments(auth.companyId, to)).portfolio : null;
  }
  if (can('reports:sales')) {
    out.sales = await getSalesSummary(auth, from, to, { personal: auth.role === 'sales' });
  } else if (can('reports:financial')) {
    out.sales = await getSalesSummary(auth, from, to);
  }
  const [[c]] = await pool.execute('SELECT COUNT(*) AS n FROM customers WHERE company_id = ? AND deleted_at IS NULL', [auth.companyId]);
  out.customerCount = Number(c.n);
  out.isNewCompany = out.customerCount === 0 && (out.financial?.isEmpty ?? true);
  return out;
}

// Detail rows for report tables/exports. Totals are computed from the SAME rows shown.
export async function getReport(companyId, type, from, to) {
  const data = await fetchPeriod(companyId, from, to);
  if (type === 'sales') {
    const rows = data.invoices.filter((i) => ['sent', 'partially_paid', 'paid', 'overdue'].includes(i.status));
    return { type, from, to, columns: ['number', 'issue_date', 'customer_name', 'status', 'total'], rows: rows.map((r) => ({ number: r.number, issue_date: r.issue_date, customer_name: r.customer_name, status: r.status, total: String(r.total) })), total: fromCents(sumCents(rows.map((r) => r.total))) };
  }
  if (type === 'expenses') {
    const rows = data.expenses.filter((e) => ['approved', 'paid'].includes(e.status));
    return { type, from, to, columns: ['expense_date', 'category_name', 'description', 'vendor', 'status', 'amount'], rows: rows.map((r) => ({ expense_date: r.expense_date, category_name: r.category_name, description: r.description, vendor: r.vendor ?? '', status: r.status, amount: String(r.amount) })), total: fromCents(sumCents(rows.map((r) => r.amount))) };
  }
  if (type === 'cashflow') {
    const rows = data.payments.filter((p) => p.status === 'completed');
    const net = sumCents(rows.filter((p) => p.direction === 'incoming').map((p) => p.amount)) - sumCents(rows.filter((p) => p.direction === 'outgoing').map((p) => p.amount));
    return { type, from, to, columns: ['paid_at', 'direction', 'kind', 'amount'], rows: rows.map((r) => ({ paid_at: r.paid_at, direction: r.direction, kind: r.kind, amount: String(r.amount) })), total: fromCents(net) };
  }
  const prev = previousPeriod(from, to);
  const summary = await getFinancialSummary(companyId, from, to);
  return { type: 'profitability', from, to, previous: prev, summary: summary.current };
}

export { totalReceivables };

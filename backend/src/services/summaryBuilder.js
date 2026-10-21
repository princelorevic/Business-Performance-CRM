// Pure assembly of dashboard/report figures from already-fetched rows.
// Kept free of SQL so totals can be tested for consistency without a database.
import { toCents, fromCents, sumCents, percentage } from '../utils/money.js';
import {
  recognizedRevenue, recognizedExpenses, netProfit, netProfitMargin, revenueGrowth,
  cashFlow, totalReceivables, REVENUE_INVOICE_STATUSES, RECOGNIZED_EXPENSE_STATUSES,
} from './financialCalculations.js';

export function bucketKey(date, granularity) {
  return granularity === 'month' ? date.slice(0, 7) : date;
}

export function granularityFor(from, to) {
  const days = (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000 + 1;
  return days > 62 ? 'month' : 'day';
}

export function periodTotals({ invoices, refunds, expenses, payments }) {
  const revenue = recognizedRevenue({ invoices, refunds });
  const exp = recognizedExpenses(expenses);
  const profit = netProfit(revenue, exp);
  return {
    revenue,
    expenses: exp,
    netProfit: profit,
    netProfitMargin: netProfitMargin(profit, revenue),
    cash: cashFlow(payments),
  };
}

export function buildTrend({ invoices, refunds, expenses, payments }, from, to) {
  const g = granularityFor(from, to);
  const buckets = new Map();
  const get = (k) => {
    if (!buckets.has(k)) buckets.set(k, { period: k, revenue: 0n, expenses: 0n, cashIn: 0n, cashOut: 0n });
    return buckets.get(k);
  };
  for (const i of invoices) if (REVENUE_INVOICE_STATUSES.includes(i.status)) get(bucketKey(i.issue_date, g)).revenue += toCents(i.total);
  for (const r of refunds) if (r.status === 'completed') get(bucketKey(r.paid_at, g)).revenue -= toCents(r.amount);
  for (const e of expenses) if (RECOGNIZED_EXPENSE_STATUSES.includes(e.status)) get(bucketKey(e.expense_date, g)).expenses += toCents(e.amount);
  for (const p of payments) {
    if (p.status !== 'completed') continue;
    const b = get(bucketKey(p.paid_at, g));
    if (p.direction === 'incoming') b.cashIn += toCents(p.amount); else b.cashOut += toCents(p.amount);
  }
  return {
    granularity: g,
    points: [...buckets.values()].sort((a, b) => (a.period < b.period ? -1 : 1)).map((b) => ({
      period: b.period,
      revenue: fromCents(b.revenue),
      expenses: fromCents(b.expenses),
      netProfit: fromCents(b.revenue - b.expenses),
      cashIn: fromCents(b.cashIn),
      cashOut: fromCents(b.cashOut),
      netCash: fromCents(b.cashIn - b.cashOut),
    })),
  };
}

export function expensesByCategory(expenses) {
  const map = new Map();
  for (const e of expenses) {
    if (!RECOGNIZED_EXPENSE_STATUSES.includes(e.status)) continue;
    map.set(e.category_name, (map.get(e.category_name) ?? 0n) + toCents(e.amount));
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0n);
  return [...map.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1)).map(([name, v]) => ({
    category: name, amount: fromCents(v), share: percentage(v, total),
  }));
}

export function revenueByCustomer(invoices, limit = 5) {
  const map = new Map();
  for (const i of invoices) {
    if (!REVENUE_INVOICE_STATUSES.includes(i.status)) continue;
    const cur = map.get(i.customer_id) ?? { name: i.customer_name, total: 0n };
    cur.total += toCents(i.total);
    map.set(i.customer_id, cur);
  }
  return [...map.values()].sort((a, b) => (b.total > a.total ? 1 : -1)).slice(0, limit).map((c) => ({ customer: c.name, revenue: fromCents(c.total) }));
}

export function buildAlerts({ totals, receivables, overdueInvoices }) {
  const alerts = [];
  if (overdueInvoices.length) {
    alerts.push({ level: 'warning', code: 'OVERDUE', message: `${overdueInvoices.length} overdue invoice(s) totalling ${fromCents(sumCents(overdueInvoices.map((i) => i.outstanding)))} are awaiting payment.` });
  }
  if (toCents(totals.cash.net) < 0n) alerts.push({ level: 'warning', code: 'NEGATIVE_CASH_FLOW', message: 'Cash paid exceeded cash received in this period.' });
  if (toCents(totals.netProfit) < 0n) alerts.push({ level: 'danger', code: 'LOSS', message: 'Recognized expenses exceeded recognized revenue in this period.' });
  if (toCents(receivables) > 0n && toCents(totals.revenue) > 0n && toCents(receivables) > toCents(totals.revenue)) {
    alerts.push({ level: 'info', code: 'HIGH_RECEIVABLES', message: 'Outstanding receivables exceed revenue for this period.' });
  }
  return alerts;
}

export function buildFinancialSummary(data, prevData, ctx) {
  const current = periodTotals(data);
  const previous = periodTotals(prevData);
  const receivables = totalReceivables(ctx.openInvoices, ctx.invoicePayments);
  return {
    current,
    previous,
    revenueGrowth: revenueGrowth(current.revenue, previous.revenue),
    receivables,
    trend: buildTrend(data, ctx.from, ctx.to),
    expenseBreakdown: expensesByCategory(data.expenses),
    topCustomers: revenueByCustomer(data.invoices),
    alerts: buildAlerts({ totals: current, receivables, overdueInvoices: ctx.overdueInvoices }),
    isEmpty: data.invoices.length === 0 && data.expenses.length === 0 && data.payments.length === 0,
  };
}

// Pure financial calculations. No database access, no side effects.
// See docs/FINANCIAL_RULES.md for the reporting basis these functions implement.

import { toCents, fromCents, sumCents, percentage } from '../utils/money.js';

// Invoice statuses that count as recognized revenue (accrual basis, by issue date).
export const REVENUE_INVOICE_STATUSES = ['sent', 'partially_paid', 'paid', 'overdue'];
// Expense statuses that count as recognized expenses (by expense date).
export const RECOGNIZED_EXPENSE_STATUSES = ['approved', 'paid'];

/**
 * Revenue = invoice totals (recognized statuses) - refunds issued in the period.
 * Payments are NOT revenue; they are cash. This prevents double counting an
 * invoice and its payment.
 */
export function recognizedRevenue({ invoices = [], refunds = [] }) {
  const gross = sumCents(
    invoices.filter((i) => REVENUE_INVOICE_STATUSES.includes(i.status)).map((i) => i.total),
  );
  const refunded = sumCents(refunds.filter((r) => r.status === 'completed').map((r) => r.amount));
  return fromCents(gross - refunded);
}

export function recognizedExpenses(expenses = []) {
  return fromCents(
    sumCents(expenses.filter((e) => RECOGNIZED_EXPENSE_STATUSES.includes(e.status)).map((e) => e.amount)),
  );
}

export function netProfit(revenue, expenses) {
  return fromCents(toCents(revenue) - toCents(expenses));
}

// null when revenue is zero (no meaningful margin).
export function netProfitMargin(profit, revenue) {
  return percentage(profit, revenue);
}

export function revenueGrowth(current, previous) {
  return percentage(toCents(current) - toCents(previous), previous);
}

/**
 * Cash flow = actual cash received - actual cash paid.
 * Only completed payments count. Refunds to customers are cash paid out.
 * `payments`: { direction: 'incoming'|'outgoing', amount, status }
 */
export function cashFlow(payments = []) {
  const done = payments.filter((p) => p.status === 'completed');
  const received = sumCents(done.filter((p) => p.direction === 'incoming').map((p) => p.amount));
  const paid = sumCents(done.filter((p) => p.direction === 'outgoing').map((p) => p.amount));
  return {
    received: fromCents(received),
    paid: fromCents(paid),
    net: fromCents(received - paid),
  };
}

/**
 * Outstanding amount for one invoice:
 * total - (completed incoming payments - completed refunds linked to it), floored at 0.
 * Void and draft invoices have no receivable.
 */
export function invoiceOutstanding(invoice, payments = []) {
  if (!['sent', 'partially_paid', 'paid', 'overdue'].includes(invoice.status)) return '0.00';
  const mine = payments.filter((p) => p.invoice_id === invoice.id && p.status === 'completed');
  const received = sumCents(mine.filter((p) => p.direction === 'incoming').map((p) => p.amount));
  const refunded = sumCents(mine.filter((p) => p.direction === 'outgoing').map((p) => p.amount));
  const outstanding = toCents(invoice.total) - (received - refunded);
  return fromCents(outstanding > 0n ? outstanding : 0n);
}

export function totalReceivables(invoices = [], payments = []) {
  return fromCents(sumCents(invoices.map((i) => invoiceOutstanding(i, payments))));
}

/** Derive invoice payment status from its total and net received amount. */
export function deriveInvoiceStatus(invoice, payments = [], today = new Date()) {
  if (invoice.status === 'void' || invoice.status === 'draft') return invoice.status;
  const outstanding = toCents(invoiceOutstanding(invoice, payments));
  const total = toCents(invoice.total);
  if (outstanding === 0n && total > 0n) return 'paid';
  const pastDue = invoice.due_date && new Date(invoice.due_date) < today;
  if (outstanding < total) return pastDue ? 'overdue' : 'partially_paid';
  return pastDue ? 'overdue' : 'sent';
}

/**
 * ROI = (attributable return - cost) / cost * 100.
 * Returns null if cost is not positive. Only returns explicitly attributed to
 * the investment are counted; total revenue is never used as a return.
 */
export function investmentRoi(investment, returns = []) {
  const cost = toCents(investment.amount);
  if (cost <= 0n) return { cost: fromCents(cost), returned: '0.00', roi: null };
  const returned = sumCents(
    returns.filter((r) => r.investment_id === investment.id).map((r) => r.amount),
  );
  return {
    cost: fromCents(cost),
    returned: fromCents(returned),
    roi: percentage(returned - cost, cost),
  };
}

export function portfolioRoi(investments = [], returns = []) {
  const cost = sumCents(investments.map((i) => i.amount));
  const ids = new Set(investments.map((i) => i.id));
  const returned = sumCents(returns.filter((r) => ids.has(r.investment_id)).map((r) => r.amount));
  return {
    cost: fromCents(cost),
    returned: fromCents(returned),
    roi: cost > 0n ? percentage(returned - cost, cost) : null,
  };
}

/** Sales target achievement = actual / target * 100 (null if no target). */
export function targetAchievement(actual, target) {
  return percentage(actual, target);
}

/** Previous period of equal length ending the day before `from`. Dates are YYYY-MM-DD. */
export function previousPeriod(from, to) {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  const days = Math.round((t - f) / 86400000) + 1;
  const prevTo = new Date(f.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(prevFrom), to: iso(prevTo) };
}

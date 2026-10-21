import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildFinancialSummary, buildTrend, periodTotals, expensesByCategory, granularityFor } from '../../src/services/summaryBuilder.js';
import { sumCents, fromCents } from '../../src/utils/money.js';

const data = {
  invoices: [
    { id: 1, total: '1000.00', status: 'paid', issue_date: '2026-10-02', customer_id: 1, customer_name: 'Acme' },
    { id: 2, total: '600.00', status: 'partially_paid', issue_date: '2026-10-10', customer_id: 2, customer_name: 'Globex' },
    { id: 3, total: '250.00', status: 'sent', issue_date: '2026-10-15', customer_id: 1, customer_name: 'Acme' },
    { id: 4, total: '999.00', status: 'draft', issue_date: '2026-10-16', customer_id: 1, customer_name: 'Acme' },
    { id: 5, total: '400.00', status: 'void', issue_date: '2026-10-17', customer_id: 2, customer_name: 'Globex' },
  ],
  payments: [
    { direction: 'incoming', kind: 'payment', amount: '1000.00', status: 'completed', paid_at: '2026-10-03', invoice_id: 1 },
    { direction: 'incoming', kind: 'payment', amount: '200.00', status: 'completed', paid_at: '2026-10-12', invoice_id: 2 },
    { direction: 'outgoing', kind: 'refund', amount: '100.00', status: 'completed', paid_at: '2026-10-14', invoice_id: 1 },
    { direction: 'outgoing', kind: 'payment', amount: '300.00', status: 'completed', paid_at: '2026-10-15', expense_id: 1 },
    { direction: 'incoming', kind: 'payment', amount: '50.00', status: 'pending', paid_at: '2026-10-16', invoice_id: 3 },
  ],
  expenses: [
    { amount: '300.00', status: 'paid', expense_date: '2026-10-05', category_name: 'Rent' },
    { amount: '150.00', status: 'approved', expense_date: '2026-10-08', category_name: 'Software' },
    { amount: '75.00', status: 'approved', expense_date: '2026-10-09', category_name: 'Rent' },
    { amount: '500.00', status: 'draft', expense_date: '2026-10-09', category_name: 'Travel' },
  ],
};
data.refunds = data.payments.filter((p) => p.kind === 'refund');
const empty = { invoices: [], payments: [], expenses: [], refunds: [] };

describe('period totals', () => {
  const t = periodTotals(data);
  test('revenue = recognized invoices - completed refunds', () => assert.equal(t.revenue, '1750.00'));
  test('expenses exclude drafts', () => assert.equal(t.expenses, '525.00'));
  test('profit and margin', () => {
    assert.equal(t.netProfit, '1225.00');
    assert.equal(t.netProfitMargin, '70.00');
  });
  test('cash differs from revenue and profit', () => {
    assert.deepEqual(t.cash, { received: '1200.00', paid: '400.00', net: '800.00' });
    assert.notEqual(t.cash.net, t.revenue);
  });
});

describe('trend and breakdown agree with headline totals', () => {
  const from = '2026-10-01'; const to = '2026-10-31';
  const trend = buildTrend(data, from, to);
  const totals = periodTotals(data);

  test('daily buckets for short ranges, monthly for long ones', () => {
    assert.equal(trend.granularity, 'day');
    assert.equal(granularityFor('2026-01-01', '2026-12-31'), 'month');
  });
  test('trend revenue sums to headline revenue', () => {
    assert.equal(fromCents(sumCents(trend.points.map((p) => p.revenue))), totals.revenue);
  });
  test('trend expenses and net profit sum to headline', () => {
    assert.equal(fromCents(sumCents(trend.points.map((p) => p.expenses))), totals.expenses);
    assert.equal(fromCents(sumCents(trend.points.map((p) => p.netProfit))), totals.netProfit);
  });
  test('trend cash sums to headline cash', () => {
    assert.equal(fromCents(sumCents(trend.points.map((p) => p.cashIn))), totals.cash.received);
    assert.equal(fromCents(sumCents(trend.points.map((p) => p.cashOut))), totals.cash.paid);
  });
  test('expense breakdown sums to headline expenses', () => {
    const b = expensesByCategory(data.expenses);
    assert.equal(fromCents(sumCents(b.map((x) => x.amount))), totals.expenses);
    assert.equal(b[0].category, 'Rent');
  });
});

describe('full summary', () => {
  const ctx = {
    from: '2026-10-01', to: '2026-10-31',
    openInvoices: [data.invoices[1], data.invoices[2]],
    invoicePayments: [data.payments[1]],
    overdueInvoices: [],
  };
  const s = buildFinancialSummary(data, empty, ctx);

  test('receivables = unpaid balances of open invoices', () => assert.equal(s.receivables, '650.00'));
  test('growth is null (not infinity) when previous revenue is zero', () => assert.equal(s.revenueGrowth, null));
  test('growth computed against a real previous period', () => {
    const prev = { ...empty, invoices: [{ id: 9, total: '875.00', status: 'paid', issue_date: '2026-09-10', customer_id: 1, customer_name: 'Acme' }] };
    assert.equal(buildFinancialSummary(data, prev, ctx).revenueGrowth, '100.00');
  });
  test('top customers only count recognized invoices', () => {
    assert.deepEqual(s.topCustomers.map((c) => [c.customer, c.revenue]), [['Acme', '1250.00'], ['Globex', '600.00']]);
  });
  test('empty company is flagged, with no fabricated numbers', () => {
    const e = buildFinancialSummary(empty, empty, { from: '2026-10-01', to: '2026-10-31', openInvoices: [], invoicePayments: [], overdueInvoices: [] });
    assert.equal(e.isEmpty, true);
    assert.equal(e.current.revenue, '0.00');
    assert.equal(e.current.netProfitMargin, null);
    assert.equal(e.alerts.length, 0);
  });
  test('loss and negative cash raise alerts', () => {
    const bad = { ...empty, expenses: [{ amount: '100.00', status: 'paid', expense_date: '2026-10-05', category_name: 'Rent' }], payments: [{ direction: 'outgoing', kind: 'payment', amount: '100.00', status: 'completed', paid_at: '2026-10-05' }] };
    const codes = buildFinancialSummary(bad, empty, { from: '2026-10-01', to: '2026-10-31', openInvoices: [], invoicePayments: [], overdueInvoices: [] }).alerts.map((a) => a.code);
    assert.ok(codes.includes('LOSS') && codes.includes('NEGATIVE_CASH_FLOW'));
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toCents, fromCents, percentage, sumCents } from '../../src/utils/money.js';
import {
  recognizedRevenue,
  recognizedExpenses,
  netProfit,
  netProfitMargin,
  revenueGrowth,
  cashFlow,
  invoiceOutstanding,
  totalReceivables,
  deriveInvoiceStatus,
  investmentRoi,
  portfolioRoi,
  targetAchievement,
  previousPeriod,
} from '../../src/services/financialCalculations.js';

describe('money helpers', () => {
  test('parses and formats without float error', () => {
    assert.equal(toCents('0.10') + toCents('0.20'), 30n);
    assert.equal(fromCents(sumCents(['0.10', '0.20'])), '0.30');
    assert.equal(fromCents(-5n), '-0.05');
    assert.equal(toCents('12'), 1200n);
    assert.equal(toCents('12.5'), 1250n);
  });

  test('rejects malformed amounts', () => {
    assert.throws(() => toCents('12.345'));
    assert.throws(() => toCents('abc'));
  });

  test('percentage rounds half away from zero and guards zero denominator', () => {
    assert.equal(percentage('1.00', '3.00'), '33.33');
    assert.equal(percentage('2.00', '3.00'), '66.67');
    assert.equal(percentage('-1.00', '3.00'), '-33.33');
    assert.equal(percentage('5.00', '0.00'), null);
  });
});

describe('revenue, expenses, profit', () => {
  const invoices = [
    { id: 1, total: '1000.00', status: 'paid' },
    { id: 2, total: '500.00', status: 'sent' },
    { id: 3, total: '300.00', status: 'draft' },
    { id: 4, total: '200.00', status: 'void' },
  ];

  test('revenue counts only recognized invoices, not drafts or voids', () => {
    assert.equal(recognizedRevenue({ invoices }), '1500.00');
  });

  test('payments are never added to revenue (no double counting)', () => {
    const payments = [{ amount: '1000.00', status: 'completed', direction: 'incoming' }];
    assert.equal(recognizedRevenue({ invoices, refunds: [] }), '1500.00');
    assert.equal(cashFlow(payments).received, '1000.00');
  });

  test('completed refunds reduce revenue; pending ones do not', () => {
    const refunds = [
      { amount: '100.00', status: 'completed' },
      { amount: '50.00', status: 'pending' },
    ];
    assert.equal(recognizedRevenue({ invoices, refunds }), '1400.00');
  });

  test('expenses count approved/paid only', () => {
    const expenses = [
      { amount: '400.00', status: 'approved' },
      { amount: '100.00', status: 'paid' },
      { amount: '999.00', status: 'draft' },
      { amount: '999.00', status: 'void' },
    ];
    assert.equal(recognizedExpenses(expenses), '500.00');
  });

  test('net profit and margin', () => {
    assert.equal(netProfit('1500.00', '500.00'), '1000.00');
    assert.equal(netProfitMargin('1000.00', '1500.00'), '66.67');
    assert.equal(netProfit('100.00', '250.00'), '-150.00');
  });

  test('margin is null when revenue is zero', () => {
    assert.equal(netProfitMargin('-50.00', '0.00'), null);
  });

  test('revenue growth including zero previous period', () => {
    assert.equal(revenueGrowth('1500.00', '1000.00'), '50.00');
    assert.equal(revenueGrowth('500.00', '1000.00'), '-50.00');
    assert.equal(revenueGrowth('500.00', '0.00'), null);
  });
});

describe('cash flow', () => {
  test('only completed payments count; revenue != cash', () => {
    const payments = [
      { direction: 'incoming', amount: '700.00', status: 'completed' },
      { direction: 'incoming', amount: '300.00', status: 'pending' },
      { direction: 'incoming', amount: '50.00', status: 'failed' },
      { direction: 'outgoing', amount: '200.00', status: 'completed' },
      { direction: 'outgoing', amount: '90.00', status: 'void' },
    ];
    assert.deepEqual(cashFlow(payments), { received: '700.00', paid: '200.00', net: '500.00' });
  });

  test('empty data gives zeros', () => {
    assert.deepEqual(cashFlow([]), { received: '0.00', paid: '0.00', net: '0.00' });
  });
});

describe('receivables and invoice status', () => {
  const invoice = { id: 10, total: '1000.00', status: 'sent', due_date: '2099-01-01' };

  test('partial payment leaves outstanding balance', () => {
    const payments = [{ invoice_id: 10, direction: 'incoming', amount: '400.00', status: 'completed' }];
    assert.equal(invoiceOutstanding(invoice, payments), '600.00');
    assert.equal(deriveInvoiceStatus(invoice, payments), 'partially_paid');
  });

  test('full payment marks paid', () => {
    const payments = [{ invoice_id: 10, direction: 'incoming', amount: '1000.00', status: 'completed' }];
    assert.equal(invoiceOutstanding(invoice, payments), '0.00');
    assert.equal(deriveInvoiceStatus(invoice, payments), 'paid');
  });

  test('refund restores the outstanding balance', () => {
    const payments = [
      { invoice_id: 10, direction: 'incoming', amount: '1000.00', status: 'completed' },
      { invoice_id: 10, direction: 'outgoing', amount: '250.00', status: 'completed' },
    ];
    assert.equal(invoiceOutstanding(invoice, payments), '250.00');
  });

  test('overpayment never produces negative receivable', () => {
    const payments = [{ invoice_id: 10, direction: 'incoming', amount: '1200.00', status: 'completed' }];
    assert.equal(invoiceOutstanding(invoice, payments), '0.00');
  });

  test('pending and failed payments do not reduce receivable', () => {
    const payments = [
      { invoice_id: 10, direction: 'incoming', amount: '500.00', status: 'pending' },
      { invoice_id: 10, direction: 'incoming', amount: '500.00', status: 'failed' },
    ];
    assert.equal(invoiceOutstanding(invoice, payments), '1000.00');
  });

  test('void and draft invoices carry no receivable', () => {
    assert.equal(invoiceOutstanding({ ...invoice, status: 'void' }, []), '0.00');
    assert.equal(invoiceOutstanding({ ...invoice, status: 'draft' }, []), '0.00');
  });

  test('past-due unpaid invoice is overdue', () => {
    const late = { ...invoice, due_date: '2020-01-01' };
    assert.equal(deriveInvoiceStatus(late, [], new Date('2026-10-17')), 'overdue');
  });

  test('total receivables sums per-invoice outstanding', () => {
    const invoices = [
      invoice,
      { id: 11, total: '200.00', status: 'sent', due_date: '2099-01-01' },
      { id: 12, total: '999.00', status: 'void', due_date: '2099-01-01' },
    ];
    const payments = [{ invoice_id: 10, direction: 'incoming', amount: '400.00', status: 'completed' }];
    assert.equal(totalReceivables(invoices, payments), '800.00');
  });
});

describe('investment ROI', () => {
  const inv = { id: 1, amount: '1000.00' };

  test('positive and negative ROI', () => {
    assert.equal(investmentRoi(inv, [{ investment_id: 1, amount: '1500.00' }]).roi, '50.00');
    assert.equal(investmentRoi(inv, [{ investment_id: 1, amount: '400.00' }]).roi, '-60.00');
  });

  test('no attributed returns means -100%, not revenue', () => {
    assert.equal(investmentRoi(inv, []).roi, '-100.00');
  });

  test('zero cost does not divide by zero', () => {
    assert.equal(investmentRoi({ id: 2, amount: '0.00' }, []).roi, null);
  });

  test('returns for other investments are ignored', () => {
    assert.equal(investmentRoi(inv, [{ investment_id: 99, amount: '5000.00' }]).returned, '0.00');
  });

  test('portfolio ROI is null with no investments', () => {
    assert.equal(portfolioRoi([], []).roi, null);
    const p = portfolioRoi([inv, { id: 2, amount: '1000.00' }], [{ investment_id: 1, amount: '3000.00' }]);
    assert.equal(p.roi, '50.00');
  });
});

describe('targets and periods', () => {
  test('target achievement', () => {
    assert.equal(targetAchievement('750.00', '1000.00'), '75.00');
    assert.equal(targetAchievement('750.00', '0.00'), null);
  });

  test('previous period has equal length and ends the day before', () => {
    assert.deepEqual(previousPeriod('2026-10-01', '2026-10-31'), { from: '2026-08-31', to: '2026-09-30' });
    assert.deepEqual(previousPeriod('2026-10-10', '2026-10-10'), { from: '2026-10-09', to: '2026-10-09' });
  });
});

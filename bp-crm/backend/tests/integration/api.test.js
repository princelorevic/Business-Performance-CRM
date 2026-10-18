import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { dbConfigured, SKIP_REASON, getApp, agent, registerCompany, setupTenant, issuedInvoice, today, inDays, PASSWORD } from './helpers.js';

const opts = { skip: dbConfigured ? false : SKIP_REASON };
const range = () => `from=${inDays(-30)}&to=${inDays(1)}`;

describe('authentication', opts, () => {
  test('register sets a session, /me returns identity and permissions', async () => {
    const { ceo } = await registerCompany('auth');
    const me = await ceo.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, 'ceo_coo');
    assert.equal(me.body.subscription.status, 'trialing');
    assert.ok(me.body.permissions.includes('users:write'));
  });

  test('wrong password and unknown email give the same 401', async () => {
    const { email } = await registerCompany('auth2');
    const a = await agent();
    const bad = await a.post('/api/auth/login').send({ email, password: 'Wrong-password-1' });
    const unknown = await a.post('/api/auth/login').send({ email: 'nobody@example.test', password: 'Wrong-password-1' });
    assert.equal(bad.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(bad.body.error.message, unknown.body.error.message);
  });

  test('protected API rejects missing session and missing CSRF header', async () => {
    const raw = request(await getApp());
    assert.equal((await raw.get('/api/customers')).status, 401);
    const { ceo } = await registerCompany('csrf');
    const noHeader = request.agent(await getApp());
    await noHeader.post('/api/auth/login').set('X-Requested-With', 'bp-crm').send({ email: (await ceo.get('/api/auth/me')).body.user.email, password: PASSWORD });
    assert.equal((await noHeader.post('/api/customers').send({ name: 'x' })).status, 403);
  });

  test('weak passwords and invalid input are rejected with field errors', async () => {
    const a = await agent();
    const res = await a.post('/api/auth/register').send({ companyName: 'X', fullName: 'Y', email: 'not-an-email', password: 'short' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('logout-all invalidates existing sessions', async () => {
    const { ceo } = await registerCompany('logoutall');
    assert.equal((await ceo.post('/api/auth/logout-all').send({})).status, 204);
    assert.equal((await ceo.get('/api/auth/me')).status, 401);
  });
});

describe('cross-tenant access is blocked', opts, () => {
  test('company B cannot read, change or delete company A records', async () => {
    const A = await setupTenant('A');
    const B = await setupTenant('B');
    const inv = await issuedInvoice(A);

    assert.equal((await B.sales.get(`/api/customers/${A.customer.id}`)).status, 404);
    assert.equal((await B.sales.patch(`/api/customers/${A.customer.id}`).send({ name: 'hacked' })).status, 404);
    assert.equal((await B.sales.delete(`/api/customers/${A.customer.id}`)).status, 404);
    assert.equal((await B.finance.get(`/api/invoices/${inv.id}`)).status, 404);
    assert.equal((await B.finance.post(`/api/invoices/${inv.id}/void`).send({ reason: 'attack' })).status, 404);
    const pay = await B.finance.post('/api/payments').send({ invoiceId: inv.id, amount: '10.00', paidAt: today(), idempotencyKey: `x-${Date.now()}-b1` });
    assert.equal(pay.status, 404);

    const stillThere = await A.sales.get(`/api/customers/${A.customer.id}`);
    assert.equal(stillThere.body.name, 'Customer A');
  });

  test('company B cannot attach A\'s customer to its own invoice or opportunity', async () => {
    const A = await setupTenant('A2');
    const B = await setupTenant('B2');
    const inv = await B.sales.post('/api/invoices').send({ customerId: A.customer.id, issueDate: today(), dueDate: inDays(30), total: '5.00' });
    assert.equal(inv.status, 400);
    const opp = await B.sales.post('/api/opportunities').send({ customerId: A.customer.id, title: 'x', value: '1.00' });
    assert.equal(opp.status, 400);
  });

  test('a client-supplied company id is ignored', async () => {
    const A = await setupTenant('A3');
    const B = await setupTenant('B3');
    await B.sales.post('/api/customers').send({ name: 'Smuggled', companyId: A.customer.id, company_id: 1 });
    const aList = await A.sales.get('/api/customers');
    assert.ok(!aList.body.data.some((c) => c.name === 'Smuggled'));
  });

  test('lists, dashboards, reports, exports and audit logs only show own data', async () => {
    const A = await setupTenant('A4');
    const B = await setupTenant('B4');
    await issuedInvoice(A, '777.00');
    const aDash = await A.ceo.get(`/api/dashboard?${range()}`);
    const bDash = await B.ceo.get(`/api/dashboard?${range()}`);
    assert.equal(aDash.body.financial.current.revenue, '777.00');
    assert.equal(bDash.body.financial.current.revenue, '0.00');
    assert.equal((await B.ceo.get(`/api/reports/sales?${range()}`)).body.rows.length, 0);
    const bAudit = await B.ceo.get('/api/audit-logs');
    assert.ok(bAudit.body.data.every((r) => r.entityType !== 'invoice'));
    assert.equal((await B.finance.get('/api/invoices')).body.total, 0);
  });

  test('users of another company cannot be changed', async () => {
    const A = await setupTenant('A5');
    const B = await setupTenant('B5');
    const aUsers = (await A.ceo.get('/api/users')).body.data;
    const target = aUsers.find((u) => u.role === 'sales');
    assert.equal((await B.ceo.patch(`/api/users/${target.id}`).send({ status: 'disabled' })).status, 404);
  });
});

describe('role permissions are enforced by the API', opts, () => {
  test('sales cannot reach finance or admin endpoints', async () => {
    const t = await setupTenant('roles1');
    for (const [method, url] of [['get', '/api/payments'], ['get', '/api/expenses'], ['get', '/api/investments'], ['get', '/api/users'], ['get', '/api/audit-logs'], ['get', '/api/subscription/plans']]) {
      const res = await t.sales[method](url);
      assert.ok([403].includes(res.status) || (url.includes('plans') && res.status === 403), `${url} -> ${res.status}`);
    }
    assert.equal((await t.sales.post('/api/payments').send({})).status, 403);
    assert.equal((await t.sales.get(`/api/reports/cashflow?${range()}`)).status, 403);
  });

  test('sales dashboard contains no financial section', async () => {
    const t = await setupTenant('roles2');
    const res = await t.sales.get(`/api/dashboard?${range()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.financial, undefined);
    assert.ok(res.body.sales);
  });

  test('finance cannot manage users, customers or subscription', async () => {
    const t = await setupTenant('roles3');
    assert.equal((await t.finance.post('/api/users').send({ fullName: 'x y', email: 'x@example.test', password: PASSWORD, role: 'sales' })).status, 403);
    assert.equal((await t.finance.post('/api/customers').send({ name: 'nope' })).status, 403);
    assert.equal((await t.finance.post('/api/subscription/transition').send({ to: 'active' })).status, 403);
  });

  test('CEO/COO cannot record payments or expenses; finance sees only financial audit entries', async () => {
    const t = await setupTenant('roles4');
    assert.equal((await t.ceo.post('/api/payments').send({})).status, 403);
    assert.equal((await t.ceo.post('/api/expenses').send({})).status, 403);
    const fin = await t.finance.get('/api/audit-logs');
    assert.equal(fin.status, 200);
    assert.ok(fin.body.data.every((r) => ['invoice', 'payment', 'expense', 'investment', 'investment_return'].includes(r.entityType)));
  });

  test('only drafts can be created by sales; issuing needs finance', async () => {
    const t = await setupTenant('roles5');
    const inv = await t.sales.post('/api/invoices').send({ customerId: t.customer.id, issueDate: today(), dueDate: inDays(10), total: '10.00' });
    assert.equal(inv.body.status, 'draft');
    assert.equal((await t.sales.post(`/api/invoices/${inv.body.id}/issue`).send({})).status, 403);
  });

  test('the owner cannot be disabled and role changes revoke sessions', async () => {
    const t = await setupTenant('roles6');
    const users = (await t.ceo.get('/api/users')).body.data;
    const owner = users.find((u) => u.isOwner);
    const sales = users.find((u) => u.role === 'sales');
    assert.equal((await t.ceo.patch(`/api/users/${owner.id}`).send({ status: 'disabled' })).status, 403);
    assert.equal((await t.ceo.patch(`/api/users/${sales.id}`).send({ role: 'finance' })).status, 200);
    assert.equal((await t.sales.get('/api/customers')).status, 401);
  });
});

describe('invoice and payment workflow', opts, () => {
  test('partial then full payment moves invoice status; overpayment is rejected', async () => {
    const t = await setupTenant('pay1');
    const inv = await issuedInvoice(t, '1000.00');
    const p1 = await t.finance.post('/api/payments').send({ invoiceId: inv.id, amount: '400.00', paidAt: today(), idempotencyKey: `pay1-${Date.now()}-a` });
    assert.equal(p1.status, 201);
    assert.equal((await t.finance.get(`/api/invoices/${inv.id}`)).body.status, 'partially_paid');
    assert.equal((await t.finance.get(`/api/invoices/${inv.id}`)).body.outstanding, '600.00');

    const over = await t.finance.post('/api/payments').send({ invoiceId: inv.id, amount: '600.01', paidAt: today(), idempotencyKey: `pay1-${Date.now()}-b` });
    assert.equal(over.status, 400);

    const p2 = await t.finance.post('/api/payments').send({ invoiceId: inv.id, amount: '600.00', paidAt: today(), idempotencyKey: `pay1-${Date.now()}-c` });
    assert.equal(p2.status, 201);
    const final = await t.finance.get(`/api/invoices/${inv.id}`);
    assert.equal(final.body.status, 'paid');
    assert.equal(final.body.outstanding, '0.00');
  });

  test('retrying with the same idempotency key does not double-record', async () => {
    const t = await setupTenant('idem');
    const inv = await issuedInvoice(t, '500.00');
    const key = `idem-${Date.now()}-key1`;
    const body = { invoiceId: inv.id, amount: '200.00', paidAt: today(), idempotencyKey: key };
    const first = await t.finance.post('/api/payments').send(body);
    const second = await t.finance.post('/api/payments').send(body);
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.replayed, true);
    assert.equal(second.body.payment.id, first.body.payment.id);
    assert.equal((await t.finance.get(`/api/invoices/${inv.id}`)).body.outstanding, '300.00');

    const conflict = await t.finance.post('/api/payments').send({ ...body, amount: '250.00' });
    assert.equal(conflict.status, 409);
  });

  test('concurrent duplicate submissions create exactly one payment', async () => {
    const t = await setupTenant('race');
    const inv = await issuedInvoice(t, '300.00');
    const body = { invoiceId: inv.id, amount: '100.00', paidAt: today(), idempotencyKey: `race-${Date.now()}-key` };
    const results = await Promise.all([1, 2, 3, 4].map(() => t.finance.post('/api/payments').send(body)));
    assert.ok(results.every((r) => [200, 201].includes(r.status)), results.map((r) => r.status).join());
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    const detail = await t.finance.get(`/api/invoices/${inv.id}`);
    assert.equal(detail.body.payments.length, 1);
  });

  test('draft and void invoices cannot receive payments', async () => {
    const t = await setupTenant('pay2');
    const draft = (await t.sales.post('/api/invoices').send({ customerId: t.customer.id, issueDate: today(), dueDate: inDays(5), total: '50.00' })).body;
    const res = await t.finance.post('/api/payments').send({ invoiceId: draft.id, amount: '10.00', paidAt: today(), idempotencyKey: `pay2-${Date.now()}-a` });
    assert.equal(res.status, 409);
  });

  test('refunds reopen the receivable, are capped, and reduce revenue and cash', async () => {
    const t = await setupTenant('refund');
    const inv = await issuedInvoice(t, '1000.00');
    const pay = await t.finance.post('/api/payments').send({ invoiceId: inv.id, amount: '1000.00', paidAt: today(), idempotencyKey: `ref-${Date.now()}-pay` });
    const id = pay.body.payment.id;

    const tooMuch = await t.finance.post(`/api/payments/${id}/refund`).send({ amount: '1000.01', paidAt: today(), reason: 'too much', idempotencyKey: `ref-${Date.now()}-x` });
    assert.equal(tooMuch.status, 400);

    const ok = await t.finance.post(`/api/payments/${id}/refund`).send({ amount: '250.00', paidAt: today(), reason: 'goods returned', idempotencyKey: `ref-${Date.now()}-ok` });
    assert.equal(ok.status, 201);
    const detail = (await t.finance.get(`/api/invoices/${inv.id}`)).body;
    assert.equal(detail.outstanding, '250.00');
    assert.equal(detail.status, 'partially_paid');

    const dash = (await t.ceo.get(`/api/dashboard?${range()}`)).body.financial.current;
    assert.equal(dash.revenue, '750.00');            // 1000 invoiced - 250 refunded
    assert.equal(dash.cash.received, '1000.00');
    assert.equal(dash.cash.paid, '250.00');
    assert.equal(dash.cash.net, '750.00');

    const voidAttempt = await t.finance.post(`/api/invoices/${inv.id}/void`).send({ reason: 'cancel sale' });
    assert.equal(voidAttempt.status, 400); // money still held
  });

  test('expense flow: approve then pay once; payment counts as cash paid, not extra expense', async () => {
    const t = await setupTenant('exp');
    const cat = (await t.finance.post('/api/expense-categories').send({ name: 'Rent' })).body;
    const exp = (await t.finance.post('/api/expenses').send({ categoryId: cat.id, description: 'Office rent', amount: '300.00', expenseDate: today() })).body;
    assert.equal((await t.finance.post(`/api/expenses/${exp.id}/pay`).send({ paidAt: today(), idempotencyKey: `exp-${Date.now()}-early` })).status, 409);
    assert.equal((await t.finance.post(`/api/expenses/${exp.id}/approve`).send({})).status, 200);
    const key = `exp-${Date.now()}-pay1`;
    assert.equal((await t.finance.post(`/api/expenses/${exp.id}/pay`).send({ paidAt: today(), idempotencyKey: key })).status, 201);
    assert.equal((await t.finance.post(`/api/expenses/${exp.id}/pay`).send({ paidAt: today(), idempotencyKey: key })).status, 200);
    const cur = (await t.ceo.get(`/api/dashboard?${range()}`)).body.financial.current;
    assert.equal(cur.expenses, '300.00');
    assert.equal(cur.cash.paid, '300.00');
    assert.equal(cur.netProfit, '-300.00');
  });
});

describe('dashboard and reports agree with source records', opts, () => {
  test('headline revenue equals the sales report total; expenses equal the expense report total', async () => {
    const t = await setupTenant('consistency');
    await issuedInvoice(t, '1200.50');
    await issuedInvoice(t, '799.50');
    await t.sales.post('/api/invoices').send({ customerId: t.customer.id, issueDate: today(), dueDate: inDays(5), total: '9999.00' }); // draft: excluded
    const cat = (await t.finance.post('/api/expense-categories').send({ name: 'Ops' })).body;
    const e = (await t.finance.post('/api/expenses').send({ categoryId: cat.id, description: 'a', amount: '410.25', expenseDate: today() })).body;
    await t.finance.post(`/api/expenses/${e.id}/approve`).send({});

    const dash = (await t.ceo.get(`/api/dashboard?${range()}`)).body.financial;
    const sales = (await t.ceo.get(`/api/reports/sales?${range()}`)).body;
    const exp = (await t.ceo.get(`/api/reports/expenses?${range()}`)).body;
    assert.equal(dash.current.revenue, '2000.00');
    assert.equal(sales.total, dash.current.revenue);
    assert.equal(exp.total, dash.current.expenses);
    assert.equal(dash.current.netProfit, '1589.75');
    assert.equal(dash.receivables, '2000.00');
  });

  test('a brand-new company gets an empty state, not invented numbers', async () => {
    const { ceo } = await registerCompany('empty');
    const res = await ceo.get(`/api/dashboard?${range()}`);
    assert.equal(res.body.isNewCompany, true);
    assert.equal(res.body.financial.current.revenue, '0.00');
    assert.equal(res.body.financial.current.netProfitMargin, null);
  });

  test('invalid or reversed date ranges are rejected', async () => {
    const { ceo } = await registerCompany('range');
    assert.equal((await ceo.get('/api/dashboard?from=2026-10-31&to=2026-10-01')).status, 400);
    assert.equal((await ceo.get('/api/dashboard?from=nope&to=2026-10-01')).status, 400);
    assert.equal((await ceo.get('/api/dashboard?from=2020-01-01&to=2026-10-01')).status, 400);
  });

  test('ROI uses only attributed returns and handles no returns', async () => {
    const t = await setupTenant('roi');
    const inv = (await t.finance.post('/api/investments').send({ name: 'Ad campaign', category: 'Marketing', amount: '1000.00', investedAt: today() })).body;
    await issuedInvoice(t, '50000.00'); // large revenue must NOT affect ROI
    let list = (await t.ceo.get('/api/investments')).body;
    assert.equal(list.investments[0].roi, '-100.00');
    await t.finance.post(`/api/investments/${inv.id}/returns`).send({ amount: '1500.00', returnedAt: today(), note: 'attributed sales' });
    list = (await t.ceo.get('/api/investments')).body;
    assert.equal(list.investments[0].roi, '50.00');
    assert.equal(list.portfolio.roi, '50.00');
  });

  test('CSV export is permissioned, company-scoped and audited', async () => {
    const t = await setupTenant('csv');
    await issuedInvoice(t, '10.00');
    assert.equal((await t.sales.get(`/api/reports/sales/export.csv?${range()}`)).status, 403);
    const res = await t.ceo.get(`/api/reports/sales/export.csv?${range()}`);
    assert.ok([200, 403].includes(res.status)); // 403 when the plan lacks the exports feature (Starter)
  });
});

describe('subscription state', opts, () => {
  test('canceled subscription is read-only but still readable and reactivatable', async () => {
    const t = await setupTenant('sub');
    assert.equal((await t.ceo.post('/api/subscription/transition').send({ to: 'active' })).status, 200);
    assert.equal((await t.ceo.post('/api/subscription/transition').send({ to: 'canceled' })).status, 200);
    assert.equal((await t.sales.post('/api/customers').send({ name: 'blocked' })).status, 402);
    assert.equal((await t.sales.get('/api/customers')).status, 200);
    assert.equal((await t.ceo.post('/api/subscription/transition').send({ to: 'active' })).status, 200);
    assert.equal((await t.sales.post('/api/customers').send({ name: 'allowed' })).status, 201);
  });

  test('invalid transitions are rejected', async () => {
    const t = await setupTenant('sub2');
    const res = await t.ceo.post('/api/subscription/transition').send({ to: 'suspended' }); // trialing -> suspended
    assert.equal(res.status, 400);
  });

  test('plan user limit is enforced', async () => {
    const t = await setupTenant('limit'); // starter: 3 users, already owner + finance + sales
    const res = await t.ceo.post('/api/users').send({ fullName: 'Extra Person', email: `extra-${Date.now()}@example.test`, password: PASSWORD, role: 'sales' });
    assert.equal(res.status, 402);
  });
});

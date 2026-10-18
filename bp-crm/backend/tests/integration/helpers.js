process.env.NODE_ENV = 'test'; // relaxes auth rate limits for the suite only
import request from 'supertest';

export const dbConfigured = Boolean(process.env.DB_NAME && process.env.JWT_SECRET && process.env.DB_USER);
export const SKIP_REASON = 'Integration tests need MySQL: set DB_* and JWT_SECRET (see backend/README) and run `npm run migrate` first.';

let app;
export async function getApp() {
  if (!app) {
    const { createApp } = await import('../../src/app.js');
    app = createApp();
  }
  return app;
}

export const PASSWORD = 'Test-passw0rd-123';
const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Agents keep the session cookie. Every write carries the CSRF header, as the real client does.
export async function agent() {
  const a = request.agent(await getApp());
  a.set('X-Requested-With', 'bp-crm');
  return a;
}

export async function registerCompany(label = 'co') {
  const a = await agent();
  const email = `${label}-${uniq()}@example.test`;
  const res = await a.post('/api/auth/register').send({ companyName: `Company ${label} ${uniq()}`, fullName: 'Owner Person', email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ceo: a, email, companyId: res.body.user.companyId };
}

export async function addUser(ceo, role) {
  const email = `${role}-${uniq()}@example.test`;
  const res = await ceo.post('/api/users').send({ fullName: `${role} user`, email, password: PASSWORD, role });
  if (res.status !== 201) throw new Error(`addUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  const a = await agent();
  const login = await a.post('/api/auth/login').send({ email, password: PASSWORD });
  if (login.status !== 200) throw new Error('login failed');
  return a;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export async function setupTenant(label) {
  const { ceo } = await registerCompany(label);
  const finance = await addUser(ceo, 'finance');
  const sales = await addUser(ceo, 'sales');
  const customer = (await sales.post('/api/customers').send({ name: `Customer ${label}` })).body;
  return { ceo, finance, sales, customer };
}

// Draft -> issued invoice, as the real workflow does.
export async function issuedInvoice(t, total = '1000.00') {
  const created = await t.sales.post('/api/invoices').send({ customerId: t.customer.id, issueDate: today(), dueDate: inDays(30), total });
  if (created.status !== 201) throw new Error(`invoice failed: ${JSON.stringify(created.body)}`);
  const issued = await t.finance.post(`/api/invoices/${created.body.id}/issue`).send({});
  return issued.body;
}

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../theme/ThemeProvider.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';
import { AuthProvider } from '../api/AuthContext.jsx';
import { App } from '../App.jsx';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });

function session(role, permissions) {
  return { user: { id: 1, email: 'a@b.test', fullName: 'Ada Lovelace', role, isOwner: true }, company: { id: 1, name: 'Acme', currency: 'USD', timezone: 'UTC' }, permissions, subscription: { status: 'active', plan: { code: 'starter', name: 'Starter' } } };
}

function mountApp(path, fetchImpl) {
  globalThis.fetch = vi.fn(fetchImpl);
  return render(
    <ThemeProvider><ToastProvider><AuthProvider><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></AuthProvider></ToastProvider></ThemeProvider>,
  );
}

describe('user journeys', () => {
  beforeEach(() => localStorage.clear());

  const unauth = (url) => (url.includes('/auth/me') ? json(401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }) : json(404, {}));

  test('visitors see the landing page with working contact links', async () => {
    mountApp('/', unauth);
    expect(await screen.findByRole('heading', { level: 1, name: /run your business with/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'roxasprince1422@gmail.com' })).toHaveAttribute('href', expect.stringMatching(/^mailto:roxasprince1422@gmail\.com/));
    expect(screen.getByRole('link', { name: '0936 089 8100' })).toHaveAttribute('href', 'tel:+639360898100');
    const gmail = screen.getByRole('link', { name: /open in gmail/i });
    expect(gmail).toHaveAttribute('href', expect.stringContaining('to=roxasprince1422%40gmail.com'));
    expect(gmail).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('the landing page invoice walkthrough steps through draft, issued, part paid and paid', async () => {
    mountApp('/', unauth);
    expect(await screen.findByText(/a draft is not revenue yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Issue the invoice' }));
    expect(screen.getByText(/revenue is counted on the issue date/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /record a ₱20,000 payment/i }));
    expect(screen.getByText(/a partial payment lands/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /record the ₱30,000 balance/i }));
    expect(screen.getByText(/paid in full/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByText(/a draft is not revenue yet/i)).toBeInTheDocument();
  });

  test('landing feature groups switch with the tabs', async () => {
    mountApp('/', unauth);
    expect(await screen.findByText('Leads')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /get paid/i }));
    expect(screen.getByRole('tab', { name: /get paid/i })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByText('Payments and refunds')).toBeInTheDocument();
    expect(screen.queryByText('Leads')).toBeNull();
  });

  test('landing mobile menu toggles and reports its state', async () => {
    mountApp('/', unauth);
    const btn = await screen.findByRole('button', { name: /open menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
  });

  test('a signed-out visitor to a private page is sent to sign in', async () => {
    mountApp('/dashboard', unauth);
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  test('a signed-in user opening the home page lands on the dashboard', async () => {
    mountApp('/', (url) => {
      if (url.includes('/auth/me')) return json(200, session('ceo_coo', ['dashboard:read', 'customers:write']));
      if (url.includes('/dashboard')) return json(200, { isNewCompany: true, financial: { isEmpty: true, alerts: [], current: {}, previous: {}, previousRange: { from: '2026-09-01', to: '2026-09-30' }, trend: { points: [] }, expenseBreakdown: [], topCustomers: [] }, roi: null });
      return json(404, {});
    });
    expect(await screen.findByText(/your workspace is ready/i)).toBeInTheDocument();
  });

  test('password can be shown and hidden on the sign-in form', async () => {
    mountApp('/login', unauth);
    const input = await screen.findByLabelText(/^password/i);
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.type(input, 'secret-123');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('secret-123');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  test('login shows server validation errors next to the fields', async () => {
    let signedIn = false;
    mountApp('/login', (url, init) => {
      if (url.includes('/auth/me')) return signedIn ? json(200, session('sales', ['dashboard:read'])) : json(401, { error: { message: 'x' } });
      if (url.includes('/auth/login')) return json(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: [{ field: 'email', message: 'Invalid email' }] } });
      return json(404, {});
    });
    await userEvent.type(await screen.findByLabelText(/email/i), 'nope');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(signedIn).toBe(false);
  });

  test('a sales user sees CRM navigation but no finance or admin links', async () => {
    mountApp('/customers', (url) => {
      if (url.includes('/auth/me')) return json(200, session('sales', ['dashboard:read', 'customers:read', 'customers:write', 'leads:read', 'opportunities:read', 'quotations:read', 'invoices:read']));
      if (url.includes('/customers')) return json(200, { data: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
      return json(404, {});
    });
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('Customers');
    expect(nav).not.toHaveTextContent('Payments');
    expect(nav).not.toHaveTextContent('Team');
    expect(nav).not.toHaveTextContent('Audit');
  });

  test('visiting a forbidden URL shows an access message, not the page', async () => {
    mountApp('/payments', (url) => (url.includes('/auth/me') ? json(200, session('sales', ['dashboard:read'])) : json(200, { data: [] })));
    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument();
  });

  test('a brand-new company sees a getting-started state, not fake metrics', async () => {
    mountApp('/dashboard', (url) => {
      if (url.includes('/auth/me')) return json(200, session('ceo_coo', ['dashboard:read', 'customers:write', 'users:write', 'invoices:create', 'expenses:write']));
      if (url.includes('/dashboard')) return json(200, { isNewCompany: true, financial: { isEmpty: true, alerts: [], current: {}, previous: {}, previousRange: { from: '2026-09-01', to: '2026-09-30' }, trend: { points: [] }, expenseBreakdown: [], topCustomers: [] }, roi: null });
      return json(404, {});
    });
    expect(await screen.findByText(/your workspace is ready/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Revenue')).toBeNull());
  });
});

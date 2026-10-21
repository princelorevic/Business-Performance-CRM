import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  test('unauthenticated visitors are sent to sign in', async () => {
    mountApp('/', (url) => (url.includes('/auth/me') ? json(401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }) : json(404, {})));
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  test('login shows server validation errors next to the fields', async () => {
    let signedIn = false;
    mountApp('/login', (url, init) => {
      if (url.includes('/auth/me')) return signedIn ? json(200, session('sales', ['dashboard:read'])) : json(401, { error: { message: 'x' } });
      if (url.includes('/auth/login')) return json(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: [{ field: 'email', message: 'Invalid email' }] } });
      return json(404, {});
    });
    await userEvent.type(await screen.findByLabelText(/email/i), 'nope');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
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
    mountApp('/', (url) => {
      if (url.includes('/auth/me')) return json(200, session('ceo_coo', ['dashboard:read', 'customers:write', 'users:write', 'invoices:create', 'expenses:write']));
      if (url.includes('/dashboard')) return json(200, { isNewCompany: true, financial: { isEmpty: true, alerts: [], current: {}, previous: {}, previousRange: { from: '2026-09-01', to: '2026-09-30' }, trend: { points: [] }, expenseBreakdown: [], topCustomers: [] }, roi: null });
      return json(404, {});
    });
    expect(await screen.findByText(/your workspace is ready/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Revenue')).toBeNull());
  });
});

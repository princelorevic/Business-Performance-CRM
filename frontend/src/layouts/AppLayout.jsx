import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV } from './nav.js';
import { useAuth } from '../api/AuthContext.jsx';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import { humanize } from '../lib/format.js';

const ROLE_LABEL = { ceo_coo: 'CEO / COO', finance: 'Finance', sales: 'Sales' };

function Sidebar({ onNavigate }) {
  const { can, session } = useAuth();
  const items = NAV.filter((n) => (n.perms ? n.perms.some(can) : can(n.perm)));
  return (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg"><Icon name="chart" className="h-4 w-4" /></span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{session.company.name}</p>
          <p className="text-xs text-muted">Performance CRM</p>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.end} onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>
              <Icon name={n.icon} className="h-[18px] w-[18px]" />{n.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppLayout() {
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  const status = session.subscription.status;

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block"><Sidebar /></aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-pop"><Sidebar onNavigate={() => setOpen(false)} /></aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="btn-ghost -ml-2 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open}><Icon name="menu" /></button>
          <div className="hidden text-sm text-muted lg:block">{ROLE_LABEL[session.user.role]} workspace</div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{session.user.fullName}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[session.user.role]}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={logout}><Icon name="logout" className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {status !== 'active' && (
            <div className="mb-6">
              <Alert tone={['expired', 'suspended', 'canceled'].includes(status) ? 'danger' : 'info'}>
                {['expired', 'suspended', 'canceled'].includes(status)
                  ? `Subscription ${humanize(status).toLowerCase()}: your data is visible but changes are disabled until it is reactivated.`
                  : `You are on a ${humanize(status).toLowerCase()} of the ${session.subscription.plan.name} plan.`}
              </Alert>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

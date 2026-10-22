// Navigation is filtered by permission for UX only; the API enforces access independently.
export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', perm: 'dashboard:read', end: true },
  { to: '/customers', label: 'Customers', icon: 'users', perm: 'customers:read' },
  { to: '/leads', label: 'Leads', icon: 'funnel', perm: 'leads:read' },
  { to: '/pipeline', label: 'Pipeline', icon: 'target', perm: 'opportunities:read' },
  { to: '/quotations', label: 'Quotations', icon: 'doc', perm: 'quotations:read' },
  { to: '/invoices', label: 'Invoices', icon: 'invoice', perm: 'invoices:read' },
  { to: '/payments', label: 'Payments', icon: 'card', perm: 'payments:read' },
  { to: '/expenses', label: 'Expenses', icon: 'receipt', perm: 'expenses:read' },
  { to: '/investments', label: 'Investments', icon: 'trend', perm: 'investments:read' },
  { to: '/reports', label: 'Reports', icon: 'chart', perm: 'dashboard:read' },
  { to: '/audit', label: 'Audit trail', icon: 'shield', perms: ['audit:read', 'audit:financial'] },
  { to: '/team', label: 'Team', icon: 'users', perm: 'users:read' },
  { to: '/subscription', label: 'Subscription', icon: 'plan', perm: 'subscription:read' },
];

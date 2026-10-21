// Single source of truth for role permissions (least privilege).
// Backend routes check these; the frontend only mirrors them for UX.
export const ROLES = ['ceo_coo', 'finance', 'sales'];

const P = {
  ceo_coo: [
    'dashboard:read', 'reports:financial', 'reports:sales', 'exports:read',
    'customers:read', 'leads:read', 'opportunities:read', 'quotations:read',
    'invoices:read', 'payments:read', 'expenses:read',
    'investments:read', 'investments:write',
    'targets:read', 'targets:write',
    'users:read', 'users:write', 'audit:read', 'audit:financial',
    'settings:write', 'subscription:read', 'subscription:manage',
  ],
  finance: [
    'dashboard:read', 'reports:financial', 'exports:read',
    'customers:read',
    'invoices:read', 'invoices:create', 'invoices:manage',
    'payments:read', 'payments:write',
    'expenses:read', 'expenses:write',
    'investments:read', 'investments:write',
    'audit:financial', 'subscription:read',
  ],
  sales: [
    'dashboard:read', 'reports:sales',
    'customers:read', 'customers:write',
    'leads:read', 'leads:write',
    'opportunities:read', 'opportunities:write',
    'quotations:read', 'quotations:write',
    'invoices:read', 'invoices:create',
    'targets:read',
  ],
};

export const PERMISSIONS = Object.fromEntries(Object.entries(P).map(([r, list]) => [r, new Set(list)]));
export const can = (role, permission) => Boolean(PERMISSIONS[role]?.has(permission));

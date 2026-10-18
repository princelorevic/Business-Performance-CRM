import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Alert, ErrorState, Spinner } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatDate } from '../lib/format.js';

const NEXT = { trialing: ['active', 'canceled'], active: ['past_due', 'suspended', 'canceled'], past_due: ['active', 'suspended', 'canceled'], suspended: ['active', 'canceled'], canceled: ['active'], expired: ['active'] };
const LABEL = { active: 'Mark active', past_due: 'Mark past due', suspended: 'Suspend', canceled: 'Cancel' };

function Usage({ label, used, limit }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-muted">{used} / {limit ?? 'Unlimited'}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${limit ? pct : 4}%` }} /></div>
    </div>
  );
}

export function SubscriptionPage() {
  const { can, refresh } = useAuth();
  const toast = useToast();
  const { data: sub, error, loading, reload } = useAsync(() => api.get('/subscription'), []);
  const plans = useAsync(() => (can('subscription:manage') ? api.get('/subscription/plans') : Promise.resolve({ data: [] })), []);
  const run = async (fn, msg) => { try { await fn(); toast.success(msg); reload(); refresh(); } catch (e) { toast.error(e.message); } };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !sub) return <Spinner />;
  return (
    <>
      <PageHeader title="Subscription" subtitle="Plan, status and usage limits for your company." />
      <div className="space-y-6">
        <Alert tone="info">{sub.note}</Alert>
        <div className="card grid gap-6 p-6 lg:grid-cols-2">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-muted">Plan</dt><dd className="font-medium">{sub.plan.name}</dd></div>
            <div><dt className="text-xs text-muted">Status</dt><dd><StatusBadge status={sub.status} /></dd></div>
            <div><dt className="text-xs text-muted">Trial ends</dt><dd>{formatDate(sub.trialEndsAt)}</dd></div>
            <div><dt className="text-xs text-muted">Renews</dt><dd>{formatDate(sub.renewsAt)}</dd></div>
          </dl>
          <div className="space-y-3">
            <Usage label="Users" used={sub.usage.users} limit={sub.limits.users} />
            <Usage label="Customers" used={sub.usage.customers} limit={sub.limits.customers} />
            <Usage label="Invoices this month" used={sub.usage.invoices} limit={sub.limits.invoicesPerMonth} />
          </div>
        </div>
        {can('subscription:manage') && (
          <>
            <div className="card p-6">
              <h2 className="mb-1 text-sm font-semibold">Change status</h2>
              <p className="mb-3 text-xs text-muted">Manual, audited changes. No payment is processed.</p>
              <div className="flex flex-wrap gap-2">
                {(NEXT[sub.status] ?? []).map((to) => <button key={to} className={to === 'canceled' || to === 'suspended' ? 'btn-secondary' : 'btn-primary'} onClick={() => window.confirm(`${LABEL[to]}?`) && run(() => api.post('/subscription/transition', { to }), 'Subscription updated')}>{LABEL[to]}</button>)}
              </div>
            </div>
            <div className="card p-6">
              <h2 className="mb-3 text-sm font-semibold">Plans</h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {plans.data?.data.map((p) => (
                  <li key={p.code} className="rounded-lg border border-border p-4 text-sm">
                    <p className="font-semibold">{p.name}</p>
                    <p className="mt-1 text-xs text-muted">{p.max_users ?? '∞'} users · {p.max_customers ?? '∞'} customers · {p.max_invoices_per_month ?? '∞'} invoices/mo</p>
                    <button className="btn-secondary mt-3 w-full" disabled={p.code === sub.plan.code} onClick={() => run(() => api.post('/subscription/plan', { plan: p.code }), 'Plan changed')}>{p.code === sub.plan.code ? 'Current plan' : 'Switch'}</button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { Icon } from './Icon.jsx';

export function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      <span>{label}…</span>
    </div>
  );
}

export function Skeleton({ className = 'h-24' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="rounded-full bg-danger-soft p-3 text-danger"><Icon name="alert" /></span>
      <p className="text-sm text-muted">{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && <button type="button" className="btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ icon = 'doc', title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="rounded-full bg-accent-soft p-3 text-accent"><Icon name={icon} className="h-6 w-6" /></span>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action}
    </div>
  );
}

const ALERT_TONES = { info: 'bg-info-soft text-info', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-success' };
export function Alert({ tone = 'info', children }) {
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 text-sm ${ALERT_TONES[tone]}`}>{children}</div>;
}

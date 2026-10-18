import { humanize } from '../../lib/format.js';

const TONES = {
  neutral: 'bg-surface-2 text-muted',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent',
};

// One place maps every status in the app to a tone, so colors stay consistent across modules.
const STATUS_TONE = {
  paid: 'success', completed: 'success', active: 'success', won: 'success', accepted: 'success', approved: 'success', converted: 'success', trialing: 'info',
  partially_paid: 'warning', sent: 'info', pending: 'warning', past_due: 'warning', negotiation: 'warning', proposal: 'info', contacted: 'info', qualified: 'accent', qualification: 'accent',
  overdue: 'danger', failed: 'danger', void: 'neutral', lost: 'danger', suspended: 'danger', canceled: 'neutral', expired: 'danger', rejected: 'danger', unqualified: 'neutral',
  draft: 'neutral', new: 'accent', prospecting: 'neutral',
};

export function Badge({ tone, children }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone] ?? TONES.neutral}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{humanize(status)}</Badge>;
}

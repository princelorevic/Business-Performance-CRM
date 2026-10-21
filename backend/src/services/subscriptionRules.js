// Pure subscription lifecycle rules (no I/O).
// There is no payment gateway yet, so "active" is only reached by an explicit, audited admin action.
export const TRANSITIONS = {
  trialing: ['active', 'canceled', 'expired'],
  active: ['past_due', 'suspended', 'canceled'],
  past_due: ['active', 'suspended', 'canceled'],
  suspended: ['active', 'canceled'],
  canceled: ['active'],
  expired: ['active'],
};

export const WRITABLE_STATUSES = ['trialing', 'active', 'past_due'];

export const canTransition = (from, to) => Boolean(TRANSITIONS[from]?.includes(to));

// A trial whose end date has passed is treated as expired, even if the stored status was never updated.
export function effectiveStatus(sub, now = new Date()) {
  if (!sub) return 'expired';
  if (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at) < now) return 'expired';
  return sub.status;
}

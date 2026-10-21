// Display formatting only. Money stays a string everywhere else; no arithmetic happens in the UI.
export function formatMoney(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export function formatCompactMoney(value, currency = 'USD') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

// `null` means "not computable" (e.g. zero denominator) and is shown as a dash, never as 0% or Infinity.
export function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function formatPlainPercent(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—';
}

export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export const isoToday = () => new Date().toISOString().slice(0, 10);
export function isoDaysAgo(days) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
export const humanize = (s) => String(s ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Idempotency keys let a retried payment submission be recognised by the server.
export const newIdempotencyKey = () => `web-${crypto.randomUUID()}`;

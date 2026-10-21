import { SERIES } from './chartTheme.js';
import { formatMoney, formatPlainPercent } from '../../lib/format.js';

// Horizontal bars instead of a pie: easier to read and accessible as plain text.
export function BreakdownList({ items, currency, labelKey, valueKey = 'amount', shareKey = 'share' }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it[labelKey]}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate">{it[labelKey]}</span>
            <span className="tabular-nums text-muted">{formatMoney(it[valueKey], currency)}{it[shareKey] != null && ` · ${formatPlainPercent(it[shareKey])}`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="presentation">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, Number(it[shareKey] ?? 0)))}%`, background: SERIES[i % SERIES.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

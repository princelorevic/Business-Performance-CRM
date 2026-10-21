import { Icon } from './Icon.jsx';
import { formatPercent } from '../../lib/format.js';

// `delta` is a percent string from the server, or null when there is no comparable previous value.
export function KpiCard({ label, value, delta, deltaLabel = 'vs previous period', hint, tone = 'default' }) {
  const n = delta === null || delta === undefined ? null : Number(delta);
  const up = n !== null && n > 0; const down = n !== null && n < 0;
  const valueTone = tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-text';
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p>
      {delta !== undefined && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          {n === null ? <span>No previous data to compare</span> : (
            <>
              <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-success' : down ? 'text-danger' : ''}`}>
                {up && <Icon name="arrowUp" className="h-3 w-3" />}{down && <Icon name="arrowDown" className="h-3 w-3" />}{formatPercent(delta)}
              </span>
              <span>{deltaLabel}</span>
            </>
          )}
        </p>
      )}
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

import { isoDaysAgo, isoToday } from '../../lib/format.js';

export const PRESETS = [
  { id: '30', label: 'Last 30 days', range: () => ({ from: isoDaysAgo(29), to: isoToday() }) },
  { id: '90', label: 'Last 90 days', range: () => ({ from: isoDaysAgo(89), to: isoToday() }) },
  { id: 'ytd', label: 'Year to date', range: () => ({ from: `${new Date().getUTCFullYear()}-01-01`, to: isoToday() }) },
  { id: '365', label: 'Last 12 months', range: () => ({ from: isoDaysAgo(364), to: isoToday() }) },
];

export function DateRangePicker({ value, onChange }) {
  const invalid = value.from > value.to;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Date range preset" className="input w-auto" defaultValue="30" onChange={(e) => onChange(PRESETS.find((p) => p.id === e.target.value).range())}>
        {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        <option value="custom" disabled>Custom</option>
      </select>
      <input type="date" aria-label="From date" className="input w-auto" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} />
      <span className="text-muted" aria-hidden="true">→</span>
      <input type="date" aria-label="To date" className="input w-auto" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} aria-invalid={invalid || undefined} />
    </div>
  );
}

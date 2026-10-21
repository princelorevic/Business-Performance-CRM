import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID, SERIES, axisProps, tooltipStyle } from './chartTheme.js';
import { formatCompactMoney, formatMoney } from '../../lib/format.js';

export function CashChart({ points, currency }) {
  const data = points.map((p) => ({ period: p.period, cashIn: Number(p.cashIn), cashOut: Number(p.cashOut) }));
  return (
    <figure>
      <figcaption className="sr-only">Cash received and cash paid over time</figcaption>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="period" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v) => formatCompactMoney(v, currency)} width={64} />
            <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(v, currency)} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }} />
            <Area dataKey="cashIn" name="Cash received" stroke={SERIES[1]} fill={SERIES[1]} fillOpacity={0.18} strokeWidth={2} />
            <Area dataKey="cashOut" name="Cash paid" stroke={SERIES[4]} fill={SERIES[4]} fillOpacity={0.14} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID, SERIES, axisProps, tooltipStyle } from './chartTheme.js';
import { formatCompactMoney, formatMoney } from '../../lib/format.js';

export function TrendChart({ points, currency }) {
  const data = points.map((p) => ({ ...p, revenue: Number(p.revenue), expenses: Number(p.expenses), netProfit: Number(p.netProfit) }));
  return (
    <figure>
      <figcaption className="sr-only">Revenue, expenses and net profit over time</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="period" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v) => formatCompactMoney(v, currency)} width={64} />
            <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(v, currency)} cursor={{ fill: 'rgb(var(--surface-2))' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }} />
            <Bar dataKey="revenue" name="Revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" name="Expenses" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line dataKey="netProfit" name="Net profit" stroke={SERIES[1]} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

// Chart colors come from CSS variables, so charts re-theme with the rest of the UI.
export const cssVar = (name) => `var(--${name})`;
export const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
export const GRID = 'var(--chart-grid)';
export const axisProps = { tick: { fill: 'rgb(var(--muted))', fontSize: 12 }, stroke: 'var(--chart-grid)', tickLine: false };
export const tooltipStyle = {
  contentStyle: { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 10, color: 'rgb(var(--text))', fontSize: 12, boxShadow: 'var(--shadow-pop)' },
  labelStyle: { color: 'rgb(var(--muted))' },
  itemStyle: { color: 'rgb(var(--text))' },
};

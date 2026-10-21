import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { DateRangePicker, PRESETS } from '../components/ui/DateRangePicker.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { KpiCard } from '../components/ui/KpiCard.jsx';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback.jsx';
import { formatMoney, formatPlainPercent, formatDate, humanize } from '../lib/format.js';

const REPORTS = [
  { id: 'sales', label: 'Sales', perm: 'reports:sales', note: 'Issued invoices in the period.' },
  { id: 'expenses', label: 'Expenses', perm: 'reports:financial', note: 'Approved and paid expenses.' },
  { id: 'cashflow', label: 'Cash flow', perm: 'reports:financial', note: 'Completed payments; total is cash in − cash out.' },
  { id: 'profitability', label: 'Profitability', perm: 'reports:financial', note: 'Revenue, expenses and net profit.' },
];
const MONEY_COLS = ['total', 'amount'];

export function ReportsPage() {
  const { can, session } = useAuth();
  const cur = session.company.currency;
  const available = REPORTS.filter((r) => can(r.perm));
  const [type, setType] = useState(available[0]?.id);
  const [range, setRange] = useState(PRESETS[0].range());
  const { data, error, loading, reload } = useAsync(() => (type ? api.get(`/reports/${type}`, range) : Promise.resolve(null)), [type, range.from, range.to]);
  if (!available.length) return <EmptyState icon="shield" title="No reports available for your role" />;

  const columns = data?.columns?.map((c) => ({
    key: c, header: humanize(c), align: MONEY_COLS.includes(c) ? 'right' : undefined,
    render: (r) => (MONEY_COLS.includes(c) ? formatMoney(r[c], cur) : /date|_at$/.test(c) ? formatDate(r[c]) : humanize(r[c])),
  }));
  const csv = can('exports:read') && data?.rows ? api.csvUrl(`/reports/${type}/export.csv`, range) : null;
  const s = data?.summary;

  return (
    <>
      <PageHeader title="Reports" subtitle="Totals are computed from the same records listed below.">
        <DateRangePicker value={range} onChange={setRange} />
        {csv && <a className="btn-secondary" href={csv}>Export CSV</a>}
      </PageHeader>
      <div role="tablist" aria-label="Report type" className="mb-4 flex flex-wrap gap-1">
        {available.map((r) => (
          <button key={r.id} role="tab" aria-selected={type === r.id} className={`btn ${type === r.id ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2'}`} onClick={() => setType(r.id)}>{r.label}</button>
        ))}
      </div>
      <p className="mb-4 text-sm text-muted">{REPORTS.find((r) => r.id === type)?.note}</p>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Spinner /> : data && (s ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Revenue" value={formatMoney(s.revenue, cur)} />
          <KpiCard label="Expenses" value={formatMoney(s.expenses, cur)} />
          <KpiCard label="Net profit" value={formatMoney(s.netProfit, cur)} tone={Number(s.netProfit) < 0 ? 'danger' : 'default'} />
          <KpiCard label="Net margin" value={formatPlainPercent(s.netProfitMargin)} hint={s.netProfitMargin === null ? 'No revenue in this period' : undefined} />
        </div>
      ) : (
        <>
          <DataTable caption={`${type} report`} columns={columns} rows={data.rows} loading={false} rowKey={(r) => JSON.stringify(r)} empty={<EmptyState icon="chart" title="No records in this period" />} />
          <p className="mt-3 text-right text-sm font-semibold tabular-nums">Total: {formatMoney(data.total, cur)} <span className="font-normal text-muted">({data.rows.length} rows)</span></p>
        </>
      ))}
    </>
  );
}

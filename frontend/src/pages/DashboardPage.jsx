import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { DateRangePicker, PRESETS } from '../components/ui/DateRangePicker.jsx';
import { KpiCard } from '../components/ui/KpiCard.jsx';
import { Alert, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { TrendChart } from '../components/charts/TrendChart.jsx';
import { CashChart } from '../components/charts/CashChart.jsx';
import { BreakdownList } from '../components/charts/BreakdownList.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { formatMoney, formatPlainPercent, formatDate } from '../lib/format.js';

function GettingStarted({ can }) {
  const steps = [
    can('customers:write') && { to: '/customers', title: 'Add your first customer', text: 'Customers are the foundation for quotes, invoices and revenue.' },
    can('invoices:create') && { to: '/invoices', title: 'Create an invoice', text: 'Invoices recognise revenue once finance issues them.' },
    can('expenses:write') && { to: '/expenses', title: 'Record an expense', text: 'Approved expenses feed profit and cash-flow figures.' },
    can('users:write') && { to: '/team', title: 'Invite your team', text: 'Add Finance and Sales users with the access they need.' },
  ].filter(Boolean);
  return (
    <div className="card">
      <EmptyState icon="dashboard" title="Your workspace is ready">
        There is no data yet, so no figures are shown. Metrics appear here as soon as you record real customers, invoices and expenses.
      </EmptyState>
      <ul className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.to}><Link to={s.to} className="block rounded-lg border border-border p-4 hover:bg-surface-2"><p className="text-sm font-medium">{s.title}</p><p className="mt-1 text-xs text-muted">{s.text}</p></Link></li>
        ))}
      </ul>
    </div>
  );
}

function FinancialSection({ d, currency }) {
  const f = d.financial; const c = f.current;
  return (
    <>
      <section aria-label="Financial KPIs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value={formatMoney(c.revenue, currency)} delta={f.revenueGrowth} hint="Issued invoices less refunds" />
        <KpiCard label="Expenses" value={formatMoney(c.expenses, currency)} hint={`Previous: ${formatMoney(f.previous.expenses, currency)}`} />
        <KpiCard label="Net profit" value={formatMoney(c.netProfit, currency)} tone={Number(c.netProfit) < 0 ? 'danger' : 'default'} hint={`Margin ${formatPlainPercent(c.netProfitMargin)}`} />
        <KpiCard label="Outstanding receivables" value={formatMoney(f.receivables, currency)} hint="Unpaid balance on open invoices (today)" />
        <KpiCard label="Cash received" value={formatMoney(c.cash.received, currency)} hint="Completed incoming payments" />
        <KpiCard label="Cash paid" value={formatMoney(c.cash.paid, currency)} hint="Expense payments and refunds" />
        <KpiCard label="Net cash flow" value={formatMoney(c.cash.net, currency)} tone={Number(c.cash.net) < 0 ? 'danger' : 'default'} hint="Cash received − cash paid" />
        <KpiCard label="Investment ROI" value={d.roi ? formatPlainPercent(d.roi.roi) : '—'} hint={d.roi && d.roi.roi === null ? 'Record an investment to see ROI' : 'Attributed returns vs invested cost (cumulative)'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><h2 className="mb-3 text-sm font-semibold">Revenue, expenses and profit</h2>
          {f.trend.points.length ? <TrendChart points={f.trend.points} currency={currency} /> : <p className="py-10 text-center text-sm text-muted">No activity in this period.</p>}
        </div>
        <div className="card p-5"><h2 className="mb-3 text-sm font-semibold">Expenses by category</h2>
          {f.expenseBreakdown.length ? <BreakdownList items={f.expenseBreakdown} currency={currency} labelKey="category" /> : <p className="py-10 text-center text-sm text-muted">No approved expenses in this period.</p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><h2 className="mb-3 text-sm font-semibold">Cash flow</h2>
          {f.trend.points.length ? <CashChart points={f.trend.points} currency={currency} /> : <p className="py-10 text-center text-sm text-muted">No payments in this period.</p>}
        </div>
        <div className="card p-5"><h2 className="mb-3 text-sm font-semibold">Top customers by revenue</h2>
          {f.topCustomers.length ? <BreakdownList items={f.topCustomers.map((t) => ({ ...t, share: Number(c.revenue) > 0 ? String((Number(t.revenue) / Number(c.revenue)) * 100) : null }))} currency={currency} labelKey="customer" valueKey="revenue" /> : <p className="py-10 text-center text-sm text-muted">No invoiced revenue in this period.</p>}
        </div>
      </section>
    </>
  );
}

function SalesSection({ s, currency }) {
  return (
    <section aria-label="Sales performance" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sales (invoiced)" value={formatMoney(s.salesTotal, currency)} hint={`${s.invoiceCount} invoice(s)`} />
        <KpiCard label="Pipeline value" value={formatMoney(s.pipelineValue, currency)} hint="Open opportunities" />
        <KpiCard label="Win rate" value={formatPlainPercent(s.conversionRate)} hint={s.conversionRate === null ? 'No deals closed in this period' : `${s.closedWon} won · ${s.closedLost} lost`} />
        <KpiCard label="Target achievement" value={s.targets[0] ? formatPlainPercent(s.targets[0].achievement) : '—'} hint={s.targets[0] ? `${formatMoney(s.targets[0].actual, currency)} of ${formatMoney(s.targets[0].target, currency)}` : 'No active sales target'} />
      </div>
      {s.pipelineByStage.length > 0 && (
        <div className="card p-5"><h2 className="mb-3 text-sm font-semibold">Pipeline by stage</h2>
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {s.pipelineByStage.map((st) => (<li key={st.stage} className="rounded-lg bg-surface-2 p-3"><StatusBadge status={st.stage} /><p className="mt-2 text-lg font-semibold tabular-nums">{st.count}</p><p className="text-xs text-muted">{formatMoney(st.value, currency)}</p></li>))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function DashboardPage() {
  const { session } = useAuth();
  const currency = session.company.currency;
  const [range, setRange] = useState(PRESETS[0].range());
  const { data, error, loading, reload } = useAsync(() => api.get('/dashboard', range), [range.from, range.to]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Management view in ${currency}. Revenue is recognised on invoice issue date; cash on payment date.`}>
        <DateRangePicker value={range} onChange={setRange} />
      </PageHeader>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} />)}</div>
      ) : data && (
        <div className="space-y-6">
          {data.isNewCompany && <GettingStarted can={(p) => session.permissions.includes(p)} />}
          {!data.isNewCompany && data.financial && (
            <>
              {data.financial.alerts.map((a) => <Alert key={a.code} tone={a.level}>{a.message}</Alert>)}
              <FinancialSection d={data} currency={currency} />
            </>
          )}
          {!data.isNewCompany && data.sales && <SalesSection s={data.sales} currency={currency} />}
          {data.financial && <p className="text-xs text-muted">Previous period: {formatDate(data.financial.previousRange.from)} – {formatDate(data.financial.previousRange.to)}. Management reporting only; not a substitute for formal accounting.</p>}
        </div>
      )}
    </>
  );
}

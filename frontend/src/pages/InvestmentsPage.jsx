import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { KpiCard } from '../components/ui/KpiCard.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { Alert, EmptyState, ErrorState, Spinner } from '../components/ui/Feedback.jsx';
import { formatMoney, formatPlainPercent, formatDate, isoToday } from '../lib/format.js';

export function InvestmentsPage() {
  const { can, session } = useAuth();
  const cur = session.company.currency;
  const { data, error, loading, reload } = useAsync(() => api.get('/investments'), []);
  const [open, setOpen] = useState(false);
  const [returnFor, setReturnFor] = useState(null);
  const blank = () => ({ name: '', category: '', purpose: '', amount: '', investedAt: isoToday() });
  const form = useForm(blank(), async (v) => { await api.post('/investments', v); setOpen(false); form.setValues(blank()); reload(); }, { successMessage: 'Investment recorded' });
  const rform = useForm({ amount: '', returnedAt: isoToday(), note: '' }, async (v) => { await api.post(`/investments/${returnFor.id}/returns`, v); setReturnFor(null); rform.reset(); reload(); }, { successMessage: 'Return recorded' });

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const p = data?.portfolio;
  return (
    <>
      <PageHeader title="Investments & ROI" subtitle="ROI = (attributed returns − cost) ÷ cost × 100, cumulative to today.">
        {can('investments:write') && <button className="btn-primary" onClick={() => setOpen(true)}>Record investment</button>}
      </PageHeader>
      {loading && !data ? <Spinner /> : data && (
        <div className="space-y-6">
          <Alert tone="info">Returns must be attributed to an investment explicitly. Company revenue is never treated as an investment return.</Alert>
          {data.investments.length === 0 ? (
            <div className="card"><EmptyState icon="trend" title="No investments recorded">Record spend you want to measure (e.g. a marketing campaign or equipment), then attach the returns it produced.</EmptyState></div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard label="Total invested" value={formatMoney(p.cost, cur)} />
                <KpiCard label="Attributed returns" value={formatMoney(p.returned, cur)} />
                <KpiCard label="Portfolio ROI" value={formatPlainPercent(p.roi)} tone={p.roi !== null && Number(p.roi) < 0 ? 'danger' : 'default'} />
              </div>
              <ul className="space-y-3">
                {data.investments.map((i) => (
                  <li key={i.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h2 className="font-semibold">{i.name}</h2><p className="text-sm text-muted">{i.category} · {formatDate(i.investedAt)}{i.purpose && ` · ${i.purpose}`}</p></div>
                      <div className="text-right"><p className="text-xs text-muted">ROI</p><p className={`text-xl font-semibold tabular-nums ${i.roi !== null && Number(i.roi) < 0 ? 'text-danger' : 'text-success'}`}>{formatPlainPercent(i.roi)}</p></div>
                    </div>
                    <p className="mt-3 text-sm text-muted">Cost {formatMoney(i.cost, cur)} · Returned {formatMoney(i.returned, cur)}</p>
                    {i.returns.length > 0 && <ul className="mt-2 text-xs text-muted">{i.returns.map((r) => <li key={r.id}>{formatDate(r.returnedAt)}: {formatMoney(r.amount, cur)}{r.note && ` — ${r.note}`}</li>)}</ul>}
                    {can('investments:write') && <button className="btn-secondary mt-3" onClick={() => setReturnFor(i)}>Add attributed return</button>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <FormDialog open={open} title="Record investment" onClose={() => setOpen(false)} form={form}>
        <TextField label="Name" value={form.values.name} onChange={form.set('name')} error={form.errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Category" value={form.values.category} onChange={form.set('category')} error={form.errors.category} required />
          <TextField label="Amount" inputMode="decimal" value={form.values.amount} onChange={form.set('amount')} error={form.errors.amount} required />
        </div>
        <TextField label="Date" type="date" value={form.values.investedAt} onChange={form.set('investedAt')} error={form.errors.investedAt} required />
        <TextField label="Purpose" value={form.values.purpose} onChange={form.set('purpose')} error={form.errors.purpose} />
      </FormDialog>
      <FormDialog open={Boolean(returnFor)} title={`Return for ${returnFor?.name ?? ''}`} onClose={() => setReturnFor(null)} form={rform}>
        <TextField label="Amount returned" inputMode="decimal" value={rform.values.amount} onChange={rform.set('amount')} error={rform.errors.amount} required />
        <TextField label="Date" type="date" value={rform.values.returnedAt} onChange={rform.set('returnedAt')} error={rform.errors.returnedAt} required />
        <TextField label="Note" value={rform.values.note} onChange={rform.set('note')} error={rform.errors.note} hint="How is this return attributable to the investment?" />
      </FormDialog>
    </>
  );
}

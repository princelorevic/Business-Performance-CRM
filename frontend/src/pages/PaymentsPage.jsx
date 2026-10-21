import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader, SearchBox } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatMoney, formatDate, humanize, isoToday, newIdempotencyKey } from '../lib/format.js';

export function PaymentsPage() {
  const { can, session } = useAuth();
  const toast = useToast();
  const cur = session.company.currency;
  const [direction, setDirection] = useState('');
  const list = usePagedList('/payments', { defaultSort: 'paidAt', filters: { direction: direction || undefined } });
  const [refunding, setRefunding] = useState(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const form = useForm({ amount: '', paidAt: isoToday(), reason: '', reference: '' },
    async (v) => { await api.post(`/payments/${refunding.id}/refund`, { ...v, idempotencyKey: key }); setRefunding(null); setKey(newIdempotencyKey()); list.reload(); },
    { successMessage: 'Refund recorded' });

  const voidPayment = async (p) => {
    const reason = window.prompt('Reason for voiding this payment (min 3 characters):');
    if (!reason || reason.trim().length < 3) return;
    try { await api.post(`/payments/${p.id}/void`, { reason }); toast.success('Payment voided'); list.reload(); } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'paidAt', header: 'Date', sortKey: 'paidAt', render: (r) => formatDate(r.paidAt) },
    { key: 'kind', header: 'Type', render: (r) => `${humanize(r.kind)} (${r.direction === 'incoming' ? 'in' : 'out'})` },
    { key: 'ref', header: 'For', render: (r) => r.invoiceNumber ?? (r.expenseId ? `Expense #${r.expenseId}` : '—') },
    { key: 'reference', header: 'Reference' },
    { key: 'amount', header: 'Amount', sortKey: 'amount', align: 'right', render: (r) => `${r.direction === 'outgoing' ? '−' : ''}${formatMoney(r.amount, cur)}` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    can('payments:write') && { key: 'a', header: '', align: 'right', render: (r) => r.status === 'completed' && (
      <div className="flex justify-end gap-1">
        {r.direction === 'incoming' && <button className="btn-ghost" onClick={() => { form.setValues({ amount: r.amount, paidAt: isoToday(), reason: '', reference: '' }); setRefunding(r); }}>Refund</button>}
        <button className="btn-ghost text-danger" onClick={() => voidPayment(r)}>Void</button>
      </div>) },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Payments" subtitle="Actual cash movements. Only completed payments count toward cash flow.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search reference or invoice" />
        <select aria-label="Filter by direction" className="input w-auto" value={direction} onChange={(e) => setDirection(e.target.value)}><option value="">All</option><option value="incoming">Cash in</option><option value="outgoing">Cash out</option></select>
      </PageHeader>
      <DataTable caption="Payments" columns={columns} {...list} empty={<EmptyState icon="card" title="No payments yet">Record payments from an invoice's detail view.</EmptyState>} />
      <FormDialog open={Boolean(refunding)} title="Refund payment" onClose={() => setRefunding(null)} form={form} submitLabel="Record refund">
        <TextField label="Refund amount" inputMode="decimal" value={form.values.amount} onChange={form.set('amount')} error={form.errors.amount} hint="Cannot exceed the amount still refundable" required />
        <TextField label="Date" type="date" value={form.values.paidAt} onChange={form.set('paidAt')} error={form.errors.paidAt} required />
        <TextField label="Reason" value={form.values.reason} onChange={form.set('reason')} error={form.errors.reason} required />
        <TextField label="Reference" value={form.values.reference} onChange={form.set('reference')} error={form.errors.reference} />
      </FormDialog>
    </>
  );
}

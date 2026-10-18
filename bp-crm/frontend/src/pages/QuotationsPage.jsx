import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader, SearchBox } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField, SelectField } from '../components/ui/Field.jsx';
import { CustomerSelect } from '../components/CustomerSelect.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatMoney, formatDate, humanize, isoToday } from '../lib/format.js';

const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export function QuotationsPage() {
  const { can, session } = useAuth();
  const toast = useToast();
  const cur = session.company.currency;
  const list = usePagedList('/quotations', { defaultSort: 'created' });
  const [open, setOpen] = useState(false);
  const blank = () => ({ customerId: '', issueDate: isoToday(), validUntil: '', total: '', status: 'draft', notes: '' });
  const form = useForm(blank(), async (v) => { await api.post('/quotations', { ...v, validUntil: v.validUntil || null }); setOpen(false); form.setValues(blank()); list.reload(); }, { successMessage: 'Quotation created' });

  const setStatus = async (r, s) => { try { await api.patch(`/quotations/${r.id}/status`, { status: s }); toast.success('Status updated'); list.reload(); } catch (e) { toast.error(e.message); } };
  const columns = [
    { key: 'number', header: 'Number', sortKey: 'number', render: (r) => <span className="font-medium">{r.number}</span> },
    { key: 'customerName', header: 'Customer' },
    { key: 'issueDate', header: 'Issued', sortKey: 'issued', render: (r) => formatDate(r.issueDate) },
    { key: 'validUntil', header: 'Valid until', render: (r) => formatDate(r.validUntil) },
    { key: 'total', header: 'Total', sortKey: 'total', align: 'right', render: (r) => formatMoney(r.total, cur) },
    { key: 'status', header: 'Status', render: (r) => can('quotations:write')
      ? <select aria-label={`Status for ${r.number}`} className="input w-auto py-1" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
      : <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader title="Quotations" subtitle="Quotes are offers. They are not revenue until an invoice is issued.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search quotations" />
        {can('quotations:write') && <button className="btn-primary" onClick={() => setOpen(true)}>New quotation</button>}
      </PageHeader>
      <DataTable caption="Quotations" columns={columns} {...list} empty={<EmptyState icon="doc" title="No quotations yet">Create a quotation for a customer.</EmptyState>} />
      <FormDialog open={open} title="New quotation" onClose={() => setOpen(false)} form={form}>
        <CustomerSelect value={form.values.customerId} onChange={form.set('customerId')} error={form.errors.customerId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Issue date" type="date" value={form.values.issueDate} onChange={form.set('issueDate')} error={form.errors.issueDate} required />
          <TextField label="Valid until" type="date" value={form.values.validUntil} onChange={form.set('validUntil')} error={form.errors.validUntil} />
        </div>
        <TextField label="Total" inputMode="decimal" value={form.values.total} onChange={form.set('total')} error={form.errors.total} required />
        <SelectField label="Status" value={form.values.status} onChange={form.set('status')} options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))} />
      </FormDialog>
    </>
  );
}

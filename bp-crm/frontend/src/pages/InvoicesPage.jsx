import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader, SearchBox } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField, TextAreaField } from '../components/ui/Field.jsx';
import { CustomerSelect } from '../components/CustomerSelect.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { InvoiceDetail } from './InvoiceDetail.jsx';
import { formatMoney, formatDate, humanize, isoToday } from '../lib/format.js';

const STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'];

export function InvoicesPage() {
  const { can, session } = useAuth();
  const cur = session.company.currency;
  const [status, setStatus] = useState('');
  const list = usePagedList('/invoices', { defaultSort: 'created', filters: { status: status || undefined } });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const blank = () => ({ customerId: '', issueDate: isoToday(), dueDate: '', total: '', notes: '' });
  const form = useForm(blank(), async (v) => { await api.post('/invoices', v); setCreating(false); form.setValues(blank()); list.reload(); }, { successMessage: 'Draft invoice created' });

  const columns = [
    { key: 'number', header: 'Number', sortKey: 'number', render: (r) => <button className="font-medium text-accent hover:underline" onClick={() => setSelected(r.id)}>{r.number}</button> },
    { key: 'customerName', header: 'Customer' },
    { key: 'issueDate', header: 'Issued', sortKey: 'issued', render: (r) => formatDate(r.issueDate) },
    { key: 'dueDate', header: 'Due', sortKey: 'due', render: (r) => formatDate(r.dueDate) },
    { key: 'total', header: 'Total', sortKey: 'total', align: 'right', render: (r) => formatMoney(r.total, cur) },
    { key: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader title="Invoices" subtitle="Revenue is recognised when an invoice is issued. Drafts are not counted.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search invoices" />
        <select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
        {can('invoices:create') && <button className="btn-primary" onClick={() => setCreating(true)}>New invoice</button>}
      </PageHeader>
      <DataTable caption="Invoices" columns={columns} {...list} empty={<EmptyState icon="invoice" title="No invoices found">Create a draft invoice. Finance issues it to recognise revenue.</EmptyState>} />
      <FormDialog open={creating} title="New draft invoice" onClose={() => setCreating(false)} form={form}>
        <CustomerSelect value={form.values.customerId} onChange={form.set('customerId')} error={form.errors.customerId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Issue date" type="date" value={form.values.issueDate} onChange={form.set('issueDate')} error={form.errors.issueDate} required />
          <TextField label="Due date" type="date" value={form.values.dueDate} onChange={form.set('dueDate')} error={form.errors.dueDate} required />
        </div>
        <TextField label="Total" inputMode="decimal" value={form.values.total} onChange={form.set('total')} error={form.errors.total} hint={`Amount in ${cur}, up to 2 decimals`} required />
        <TextAreaField label="Notes" value={form.values.notes} onChange={form.set('notes')} error={form.errors.notes} />
      </FormDialog>
      <InvoiceDetail id={selected} onClose={() => setSelected(null)} onChanged={list.reload} />
    </>
  );
}

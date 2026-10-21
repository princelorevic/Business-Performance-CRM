import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader, SearchBox } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField, SelectField } from '../components/ui/Field.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { humanize } from '../lib/format.js';

const STATUSES = ['new', 'contacted', 'qualified', 'unqualified'];

export function LeadsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const list = usePagedList('/leads', { defaultSort: 'created', filters: { status: status || undefined } });
  const [open, setOpen] = useState(false);
  const form = useForm({ name: '', email: '', phone: '', source: '', status: 'new' }, async (v) => { await api.post('/leads', v); setOpen(false); form.reset(); list.reload(); }, { successMessage: 'Lead added' });

  const act = async (fn, msg) => { try { await fn(); toast.success(msg); list.reload(); } catch (e) { toast.error(e.message); } };
  const columns = [
    { key: 'name', header: 'Lead', sortKey: 'name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'source', header: 'Source' },
    { key: 'status', header: 'Status', sortKey: 'status', render: (r) => (
      can('leads:write') && r.status !== 'converted'
        ? <select aria-label={`Status for ${r.name}`} className="input w-auto py-1" value={r.status} onChange={(e) => act(() => api.patch(`/leads/${r.id}`, { status: e.target.value }), 'Status updated')}>{STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
        : <StatusBadge status={r.status} />) },
    can('leads:write') && { key: 'a', header: '', align: 'right', render: (r) => r.status !== 'converted' && <button className="btn-secondary" onClick={() => act(() => api.post(`/leads/${r.id}/convert`), 'Converted to customer')}>Convert to customer</button> },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Leads" subtitle="Track prospects until they become customers.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search leads" />
        <select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{[...STATUSES, 'converted'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
        {can('leads:write') && <button className="btn-primary" onClick={() => setOpen(true)}>Add lead</button>}
      </PageHeader>
      <DataTable caption="Leads" columns={columns} {...list} empty={<EmptyState icon="funnel" title="No leads found">Add leads as they come in, then convert the good ones.</EmptyState>} />
      <FormDialog open={open} title="Add lead" onClose={() => setOpen(false)} form={form}>
        <TextField label="Name" value={form.values.name} onChange={form.set('name')} error={form.errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" value={form.values.email} onChange={form.set('email')} error={form.errors.email} />
          <TextField label="Phone" value={form.values.phone} onChange={form.set('phone')} error={form.errors.phone} />
        </div>
        <TextField label="Source" value={form.values.source} onChange={form.set('source')} hint="e.g. Referral, Website, Event" />
        <SelectField label="Status" value={form.values.status} onChange={form.set('status')} options={STATUSES.map((s) => ({ value: s, label: humanize(s) }))} />
      </FormDialog>
    </>
  );
}

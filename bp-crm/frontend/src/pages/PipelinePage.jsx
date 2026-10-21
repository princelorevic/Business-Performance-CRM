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
import { EmptyState } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatMoney, formatDate, humanize } from '../lib/format.js';

const STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];

export function PipelinePage() {
  const { can, session } = useAuth();
  const toast = useToast();
  const cur = session.company.currency;
  const [stage, setStage] = useState('');
  const list = usePagedList('/opportunities', { defaultSort: 'created', filters: { stage: stage || undefined } });
  const [open, setOpen] = useState(false);
  const blank = { customerId: '', title: '', value: '', stage: 'prospecting', expectedCloseDate: '' };
  const form = useForm(blank, async (v) => {
    await api.post('/opportunities', { ...v, expectedCloseDate: v.expectedCloseDate || null });
    setOpen(false); form.reset(); list.reload();
  }, { successMessage: 'Opportunity created' });

  const move = async (r, s) => { try { await api.patch(`/opportunities/${r.id}`, { stage: s }); toast.success('Stage updated'); list.reload(); } catch (e) { toast.error(e.message); } };
  const columns = [
    { key: 'title', header: 'Opportunity', sortKey: 'title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'customerName', header: 'Customer' },
    { key: 'value', header: 'Value', sortKey: 'value', align: 'right', render: (r) => formatMoney(r.value, cur) },
    { key: 'stage', header: 'Stage', sortKey: 'stage', render: (r) => can('opportunities:write')
      ? <select aria-label={`Stage for ${r.title}`} className="input w-auto py-1" value={r.stage} onChange={(e) => move(r, e.target.value)}>{STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
      : humanize(r.stage) },
    { key: 'expectedCloseDate', header: 'Expected close', render: (r) => formatDate(r.expectedCloseDate) },
  ];

  return (
    <>
      <PageHeader title="Sales pipeline" subtitle="Opportunities by stage. Moving a deal to Won or Lost records its close date.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search opportunities" />
        <select aria-label="Filter by stage" className="input w-auto" value={stage} onChange={(e) => setStage(e.target.value)}><option value="">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
        {can('opportunities:write') && <button className="btn-primary" onClick={() => setOpen(true)}>New opportunity</button>}
      </PageHeader>
      <DataTable caption="Opportunities" columns={columns} {...list} empty={<EmptyState icon="target" title="No opportunities yet">Create an opportunity for a customer to start tracking your pipeline value.</EmptyState>} />
      <FormDialog open={open} title="New opportunity" onClose={() => setOpen(false)} form={form}>
        <CustomerSelect value={form.values.customerId} onChange={form.set('customerId')} error={form.errors.customerId} />
        <TextField label="Title" value={form.values.title} onChange={form.set('title')} error={form.errors.title} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Value" inputMode="decimal" value={form.values.value} onChange={form.set('value')} error={form.errors.value} required />
          <TextField label="Expected close" type="date" value={form.values.expectedCloseDate} onChange={form.set('expectedCloseDate')} error={form.errors.expectedCloseDate} />
        </div>
        <SelectField label="Stage" value={form.values.stage} onChange={form.set('stage')} options={STAGES.map((s) => ({ value: s, label: humanize(s) }))} />
      </FormDialog>
    </>
  );
}

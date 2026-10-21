import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader, SearchBox } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField, SelectField } from '../components/ui/Field.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatMoney, formatDate, humanize, isoToday, newIdempotencyKey } from '../lib/format.js';

export function ExpensesPage() {
  const { can, session } = useAuth();
  const toast = useToast();
  const cur = session.company.currency;
  const [status, setStatus] = useState('');
  const list = usePagedList('/expenses', { defaultSort: 'date', filters: { status: status || undefined } });
  const cats = useAsync(() => api.get('/expense-categories'), []);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const blank = () => ({ categoryId: '', description: '', vendor: '', amount: '', expenseDate: isoToday() });
  const form = useForm(blank(), async (v) => { await api.post('/expenses', v); setOpen(false); form.setValues(blank()); list.reload(); }, { successMessage: 'Expense saved as draft' });
  const catForm = useForm({ name: '' }, async (v) => { await api.post('/expense-categories', v); setCatOpen(false); catForm.reset(); cats.reload(); }, { successMessage: 'Category added' });

  const act = async (fn, msg) => { try { await fn(); toast.success(msg); list.reload(); } catch (e) { toast.error(e.message); } };
  const columns = [
    { key: 'expenseDate', header: 'Date', sortKey: 'date', render: (r) => formatDate(r.expenseDate) },
    { key: 'description', header: 'Description', render: (r) => <span className="font-medium">{r.description}</span> },
    { key: 'categoryName', header: 'Category' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'amount', header: 'Amount', sortKey: 'amount', align: 'right', render: (r) => formatMoney(r.amount, cur) },
    { key: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusBadge status={r.status} /> },
    can('expenses:write') && { key: 'a', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1">
        {r.status === 'draft' && <button className="btn-ghost" onClick={() => act(() => api.post(`/expenses/${r.id}/approve`), 'Expense approved')}>Approve</button>}
        {r.status === 'approved' && can('payments:write') && <button className="btn-ghost" onClick={() => act(() => api.post(`/expenses/${r.id}/pay`, { paidAt: isoToday(), idempotencyKey: newIdempotencyKey() }), 'Expense paid')}>Mark paid</button>}
        {['draft', 'approved'].includes(r.status) && <button className="btn-ghost text-danger" onClick={() => window.confirm('Void this expense?') && act(() => api.post(`/expenses/${r.id}/void`), 'Expense voided')}>Void</button>}
      </div>) },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Expenses" subtitle="Approved and paid expenses are recognised by expense date. Drafts are not counted.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search expenses" />
        <select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['draft', 'approved', 'paid', 'void'].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
        {can('expenses:write') && <><button className="btn-secondary" onClick={() => setCatOpen(true)}>Add category</button><button className="btn-primary" onClick={() => setOpen(true)}>New expense</button></>}
      </PageHeader>
      <DataTable caption="Expenses" columns={columns} {...list} empty={<EmptyState icon="receipt" title="No expenses yet">Add a category, then record an expense.</EmptyState>} />
      <FormDialog open={open} title="New expense" onClose={() => setOpen(false)} form={form}>
        <SelectField label="Category" value={form.values.categoryId} onChange={form.set('categoryId')} error={form.errors.categoryId} options={(cats.data?.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} placeholder={cats.data?.data?.length ? 'Select a category' : 'Add a category first'} required />
        <TextField label="Description" value={form.values.description} onChange={form.set('description')} error={form.errors.description} required />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Amount" inputMode="decimal" value={form.values.amount} onChange={form.set('amount')} error={form.errors.amount} required />
          <TextField label="Date" type="date" value={form.values.expenseDate} onChange={form.set('expenseDate')} error={form.errors.expenseDate} required />
          <TextField label="Vendor" value={form.values.vendor} onChange={form.set('vendor')} error={form.errors.vendor} />
        </div>
      </FormDialog>
      <FormDialog open={catOpen} title="New expense category" onClose={() => setCatOpen(false)} form={catForm}>
        <TextField label="Category name" value={catForm.values.name} onChange={catForm.set('name')} error={catForm.errors.name} required />
      </FormDialog>
    </>
  );
}

import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader, SearchBox } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField, TextAreaField } from '../components/ui/Field.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatDate } from '../lib/format.js';

const BLANK = { name: '', email: '', phone: '', address: '', notes: '' };

export function CustomersPage() {
  const { can } = useAuth();
  const toast = useToast();
  const list = usePagedList('/customers', { defaultSort: 'created' });
  const [editing, setEditing] = useState(null); // null | 'new' | customer
  const form = useForm(BLANK, async (v) => {
    const body = { ...v };
    if (editing === 'new') await api.post('/customers', body); else await api.patch(`/customers/${editing.id}`, body);
    setEditing(null); list.reload();
  }, { successMessage: 'Customer saved' });

  const open = (c) => { form.setValues(c === 'new' ? BLANK : { name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '' }); setEditing(c); };
  const remove = async (c) => {
    if (!window.confirm(`Archive ${c.name}? Their invoices and history are kept.`)) return;
    try { await api.del(`/customers/${c.id}`); toast.success('Customer archived'); list.reload(); } catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'name', header: 'Name', sortKey: 'name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'email', header: 'Email', sortKey: 'email' },
    { key: 'phone', header: 'Phone' },
    { key: 'createdAt', header: 'Added', sortKey: 'created', render: (r) => formatDate(r.createdAt) },
    can('customers:write') && { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-1"><button className="btn-ghost" onClick={() => open(r)}>Edit</button><button className="btn-ghost text-danger" onClick={() => remove(r)}>Archive</button></div>) },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Customers" subtitle="People and companies you sell to.">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search customers" />
        {can('customers:write') && <button className="btn-primary" onClick={() => open('new')}>Add customer</button>}
      </PageHeader>
      <DataTable caption="Customers" columns={columns} {...list}
        empty={<EmptyState icon="users" title={list.search ? 'No matching customers' : 'No customers yet'}>{list.search ? 'Try a different search.' : 'Add your first customer to start quoting and invoicing.'}</EmptyState>} />
      <FormDialog open={Boolean(editing)} title={editing === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => setEditing(null)} form={form}>
        <TextField label="Name" value={form.values.name} onChange={form.set('name')} error={form.errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" value={form.values.email} onChange={form.set('email')} error={form.errors.email} />
          <TextField label="Phone" value={form.values.phone} onChange={form.set('phone')} error={form.errors.phone} />
        </div>
        <TextField label="Address" value={form.values.address} onChange={form.set('address')} error={form.errors.address} />
        <TextAreaField label="Notes" value={form.values.notes} onChange={form.set('notes')} error={form.errors.notes} />
      </FormDialog>
    </>
  );
}

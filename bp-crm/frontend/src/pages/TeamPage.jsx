import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useForm } from '../hooks/useForm.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { FormDialog } from '../components/ui/FormDialog.jsx';
import { TextField, SelectField } from '../components/ui/Field.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatDate } from '../lib/format.js';

const ROLES = [{ value: 'ceo_coo', label: 'CEO / COO' }, { value: 'finance', label: 'Finance' }, { value: 'sales', label: 'Sales' }];

export function TeamPage() {
  const { can, session } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get('/users'), []);
  const [open, setOpen] = useState(false);
  const form = useForm({ fullName: '', email: '', password: '', role: 'sales' }, async (v) => { await api.post('/users', v); setOpen(false); form.reset(); reload(); }, { successMessage: 'User added' });
  const update = async (u, body) => { try { await api.patch(`/users/${u.id}`, body); toast.success('User updated'); reload(); } catch (e) { toast.error(e.message); } };

  const columns = [
    { key: 'fullName', header: 'Name', render: (r) => <span className="font-medium">{r.fullName}{r.isOwner && ' (owner)'}</span> },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (r) => can('users:write') && !r.isOwner && r.id !== session.user.id
      ? <select aria-label={`Role for ${r.fullName}`} className="input w-auto py-1" value={r.role} onChange={(e) => update(r, { role: e.target.value })}>{ROLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      : ROLES.find((o) => o.value === r.role)?.label },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastLoginAt', header: 'Last sign-in', render: (r) => formatDate(r.lastLoginAt) },
    can('users:write') && { key: 'a', header: '', align: 'right', render: (r) => !r.isOwner && r.id !== session.user.id && (
      <button className="btn-ghost" onClick={() => update(r, { status: r.status === 'active' ? 'disabled' : 'active' })}>{r.status === 'active' ? 'Disable' : 'Enable'}</button>) },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Team" subtitle="Roles are enforced by the server. Changing a role or disabling a user signs them out.">
        {can('users:write') && <button className="btn-primary" onClick={() => setOpen(true)}>Add user</button>}
      </PageHeader>
      <DataTable caption="Team members" columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} />
      <FormDialog open={open} title="Add user" onClose={() => setOpen(false)} form={form}>
        <TextField label="Full name" value={form.values.fullName} onChange={form.set('fullName')} error={form.errors.fullName} required />
        <TextField label="Email" type="email" value={form.values.email} onChange={form.set('email')} error={form.errors.email} required />
        <TextField label="Temporary password" type="password" autoComplete="new-password" value={form.values.password} onChange={form.set('password')} error={form.errors.password} hint="At least 10 characters, letters and numbers. Share it securely." required />
        <SelectField label="Role" value={form.values.role} onChange={form.set('role')} options={ROLES} />
      </FormDialog>
    </>
  );
}

import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useForm } from '../hooks/useForm.js';
import { Modal } from '../components/ui/Modal.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Alert, ErrorState, Spinner } from '../components/ui/Feedback.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatMoney, formatDate, humanize, isoToday, newIdempotencyKey } from '../lib/format.js';

function PaymentForm({ invoice, onDone }) {
  // One key per form instance: a double-click or retry replays the same request safely.
  const [key] = useState(newIdempotencyKey);
  const form = useForm({ amount: invoice.outstanding, paidAt: isoToday(), reference: '' },
    async (v) => { await api.post('/payments', { invoiceId: invoice.id, ...v, idempotencyKey: key }); onDone(); },
    { successMessage: 'Payment recorded' });
  return (
    <form onSubmit={form.submit} noValidate className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">Record payment</h3>
      {form.formError && <Alert tone="danger">{form.formError}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Amount" inputMode="decimal" value={form.values.amount} onChange={form.set('amount')} error={form.errors.amount} />
        <TextField label="Date received" type="date" value={form.values.paidAt} onChange={form.set('paidAt')} error={form.errors.paidAt} />
        <TextField label="Reference" value={form.values.reference} onChange={form.set('reference')} error={form.errors.reference} />
      </div>
      <button className="btn-primary" disabled={form.busy}>{form.busy ? 'Recording…' : 'Record payment'}</button>
    </form>
  );
}

export function InvoiceDetail({ id, onClose, onChanged }) {
  const { can, session } = useAuth();
  const toast = useToast();
  const cur = session.company.currency;
  const { data: inv, error, loading, reload } = useAsync(() => (id ? api.get(`/invoices/${id}`) : Promise.resolve(null)), [id]);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');

  const refresh = () => { reload(); onChanged(); };
  const run = async (fn, msg) => { try { await fn(); toast.success(msg); refresh(); } catch (e) { toast.error(e.message); } };
  const canPay = can('payments:write') && inv && ['sent', 'partially_paid', 'overdue'].includes(inv.status) && Number(inv.outstanding) > 0;

  return (
    <Modal open={Boolean(id)} title={inv ? `Invoice ${inv.number}` : 'Invoice'} onClose={onClose} wide>
      {loading && !inv ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : inv && (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted">Customer</dt><dd className="font-medium">{inv.customerName}</dd></div>
            <div><dt className="text-xs text-muted">Status</dt><dd><StatusBadge status={inv.status} /></dd></div>
            <div><dt className="text-xs text-muted">Total</dt><dd className="font-medium tabular-nums">{formatMoney(inv.total, cur)}</dd></div>
            <div><dt className="text-xs text-muted">Outstanding</dt><dd className="font-medium tabular-nums">{formatMoney(inv.outstanding, cur)}</dd></div>
            <div><dt className="text-xs text-muted">Issued</dt><dd>{formatDate(inv.issueDate)}</dd></div>
            <div><dt className="text-xs text-muted">Due</dt><dd>{formatDate(inv.dueDate)}</dd></div>
          </dl>

          {can('invoices:manage') && inv.status === 'draft' && (
            <button className="btn-primary" onClick={() => run(() => api.post(`/invoices/${inv.id}/issue`), 'Invoice issued')}>Issue invoice</button>
          )}
          {canPay && <PaymentForm key={inv.payments.length} invoice={inv} onDone={refresh} />}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Payment history</h3>
            {inv.payments.length === 0 ? <p className="text-sm text-muted">No payments recorded.</p> : (
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span>{humanize(p.kind)} · {formatDate(p.paidAt)}{p.reference && ` · ${p.reference}`}</span>
                    <span className="flex items-center gap-2 tabular-nums"><StatusBadge status={p.status} />{p.direction === 'outgoing' ? '−' : ''}{formatMoney(p.amount, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {can('invoices:manage') && inv.status !== 'void' && inv.status !== 'draft' && (
            voiding ? (
              <div className="space-y-2 rounded-lg border border-danger p-4">
                <TextField label="Reason for voiding" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <button className="btn-danger" disabled={reason.trim().length < 3} onClick={() => run(() => api.post(`/invoices/${inv.id}/void`, { reason }), 'Invoice voided')}>Confirm void</button>
                  <button className="btn-secondary" onClick={() => setVoiding(false)}>Cancel</button>
                </div>
              </div>
            ) : <button className="btn-ghost text-danger" onClick={() => setVoiding(true)}>Void invoice…</button>
          )}
        </div>
      )}
    </Modal>
  );
}

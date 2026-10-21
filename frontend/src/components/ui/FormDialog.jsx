import { Modal } from './Modal.jsx';
import { Alert } from './Feedback.jsx';

export function FormDialog({ open, title, onClose, form, children, submitLabel = 'Save', wide }) {
  return (
    <Modal open={open} title={title} onClose={onClose} wide={wide}>
      <form onSubmit={form.submit} noValidate className="space-y-4">
        {form.formError && <Alert tone="danger">{form.formError}</Alert>}
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={form.busy}>{form.busy ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

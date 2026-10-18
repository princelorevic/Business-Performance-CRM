import { useState } from 'react';
import { fieldErrors } from '../api/client.js';
import { useToast } from '../components/ui/Toast.jsx';

// Form state + submit handling that maps server validation errors onto fields.
export function useForm(initial, onSubmit, { successMessage } = {}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target ? e.target.value : e }));
  const reset = () => { setValues(initial); setErrors({}); setFormError(null); };

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true); setErrors({}); setFormError(null);
    try {
      const result = await onSubmit(values);
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) setFormError(err.message);
      return undefined;
    } finally { setBusy(false); }
  };

  return { values, set, setValues, errors, formError, busy, submit, reset };
}

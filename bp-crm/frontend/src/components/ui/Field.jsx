import { useId } from 'react';

// Label + control + error wired together for screen readers.
export function Field({ label, error, hint, children, required }) {
  const id = useId();
  const described = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="label">{label}{required && <span className="text-danger" aria-hidden="true"> *</span>}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': described, className: `input ${error ? 'border-danger' : ''}` })}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const TextField = ({ label, error, hint, required, ...props }) => (
  <Field label={label} error={error} hint={hint} required={required}>{(a) => <input {...a} {...props} required={required} />}</Field>
);

export const SelectField = ({ label, error, options, required, placeholder, ...props }) => (
  <Field label={label} error={error} required={required}>
    {(a) => (
      <select {...a} {...props} required={required}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )}
  </Field>
);

export const TextAreaField = ({ label, error, ...props }) => (
  <Field label={label} error={error}>{(a) => <textarea rows={3} {...a} {...props} />}</Field>
);

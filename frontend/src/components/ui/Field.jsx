import { useId, useState } from 'react';
import { Icon } from './Icon.jsx';

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

// Password input with a show/hide toggle. The toggle is a real button (keyboard reachable,
// announced with its pressed state) and never changes autocomplete behaviour.
export function PasswordField({ label, error, hint, required, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(a) => (
        <div className="relative">
          <input {...a} {...props} type={shown ? 'text' : 'password'} required={required} className={`${a.className} pr-11`} />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} className="h-5 w-5" />
          </button>
        </div>
      )}
    </Field>
  );
}

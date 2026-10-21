import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';
import { TextField } from '../components/ui/Field.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import { ThemeToggle } from '../theme/ThemeToggle.jsx';
import { Icon } from '../components/ui/Icon.jsx';

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end p-4"><ThemeToggle /></div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg"><Icon name="chart" /></span>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          <div className="card p-6">{children}</div>
          <p className="mt-4 text-center text-sm text-muted">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from ?? '/';
  const form = useForm({ email: '', password: '' }, async (v) => { await login(v.email, v.password); navigate(from, { replace: true }); });
  if (session) return <Navigate to="/" replace />;
  return (
    <Shell title="Welcome back" subtitle="Sign in to your company workspace" footer={<>New company? <Link className="text-accent hover:underline" to="/register">Create a workspace</Link></>}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        {form.formError && <Alert tone="danger">{form.formError}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" value={form.values.email} onChange={form.set('email')} error={form.errors.email} required />
        <TextField label="Password" type="password" autoComplete="current-password" value={form.values.password} onChange={form.set('password')} error={form.errors.password} required />
        <button className="btn-primary w-full" disabled={form.busy}>{form.busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </Shell>
  );
}

export function RegisterPage() {
  const { session, register } = useAuth();
  const navigate = useNavigate();
  const [tz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const form = useForm({ companyName: '', fullName: '', email: '', password: '', currency: 'USD' },
    async (v) => { await register({ ...v, timezone: tz }); navigate('/', { replace: true }); });
  if (session) return <Navigate to="/" replace />;
  return (
    <Shell title="Create your workspace" subtitle="Start a 14-day trial. You become the CEO/COO account owner." footer={<>Already have an account? <Link className="text-accent hover:underline" to="/login">Sign in</Link></>}>
      <form onSubmit={form.submit} className="space-y-4" noValidate>
        {form.formError && <Alert tone="danger">{form.formError}</Alert>}
        <TextField label="Company name" value={form.values.companyName} onChange={form.set('companyName')} error={form.errors.companyName} required />
        <TextField label="Your name" autoComplete="name" value={form.values.fullName} onChange={form.set('fullName')} error={form.errors.fullName} required />
        <TextField label="Work email" type="email" autoComplete="email" value={form.values.email} onChange={form.set('email')} error={form.errors.email} required />
        <TextField label="Password" type="password" autoComplete="new-password" value={form.values.password} onChange={form.set('password')} error={form.errors.password} hint="At least 10 characters, with letters and numbers." required />
        <TextField label="Currency (ISO code)" maxLength={3} value={form.values.currency} onChange={(e) => form.set('currency')(e.target.value.toUpperCase())} error={form.errors.currency} />
        <button className="btn-primary w-full" disabled={form.busy}>{form.busy ? 'Creating…' : 'Create workspace'}</button>
      </form>
    </Shell>
  );
}

import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon.jsx';
import './landing-page.css';

const features = [
  {
    number: '01',
    title: 'One view of business performance',
    description: 'Bring customer activity, sales opportunities, invoices, expenses, and investment tracking into a shared workspace.',
    icon: 'dashboard',
  },
  {
    number: '02',
    title: 'Financial clarity for decisions',
    description: 'Review revenue, expenses, receivables, cash flow trends, and ROI using the data your team records.',
    icon: 'chart',
  },
  {
    number: '03',
    title: 'AI advisory with your own key',
    description: 'Use the Bring Your Own Key approach for AI-assisted business analysis, with provider availability depending on your configured integration.',
    icon: 'chart',
  },
];

const audiences = [
  { title: 'Business leaders', role: 'CEO / COO', description: 'Get a clearer overview of performance and the questions that deserve attention.', icon: 'target' },
  { title: 'Finance teams', role: 'Finance', description: 'Keep invoices, payments, expenses, and investment figures organized in one place.', icon: 'receipt' },
  { title: 'Sales teams', role: 'Sales', description: 'Track customers, leads, quotations, and opportunities as they move through the pipeline.', icon: 'users' },
];

function Mark({ className = '' }) {
  return <span className={`landing-mark ${className}`} aria-hidden="true"><Icon name="chart" className="h-5 w-5" /></span>;
}

function DashboardPreview() {
  return (
    <div className="landing-preview" aria-label="Illustrative business dashboard preview">
      <div className="landing-preview-topbar">
        <div className="flex items-center gap-2"><Mark className="!h-7 !w-7 !rounded-lg" /><span className="text-xs font-semibold tracking-tight">Business overview</span></div>
        <span className="landing-preview-period">Last 30 days <span aria-hidden="true">⌄</span></span>
      </div>
      <div className="landing-preview-body">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[11px] text-slate-500">Executive dashboard</p><p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Performance snapshot</p></div>
          <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">Illustrative data</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="landing-metric"><p>Revenue</p><strong>$48,290</strong><span className="text-emerald-700">Recorded sales</span></div>
          <div className="landing-metric"><p>Expenses</p><strong>$18,640</strong><span>Recorded outflow</span></div>
          <div className="landing-metric col-span-2 sm:col-span-1"><p>Open invoices</p><strong>12</strong><span>Awaiting payment</span></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.45fr_1fr]">
          <div className="landing-chart-card">
            <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-800">Revenue trend</span><span className="text-[10px] text-slate-400">Example only</span></div>
            <div className="landing-chart" aria-hidden="true">
              {[34, 46, 40, 58, 52, 68, 61, 79, 72, 88, 75, 94].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-slate-400"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
          </div>
          <div className="landing-chart-card">
            <span className="text-xs font-semibold text-slate-800">Business signals</span>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-blue-600" /><div><p className="text-[11px] font-medium text-slate-800">Receivables</p><p className="text-[10px] leading-relaxed text-slate-500">Review invoices nearing their due date.</p></div></div>
              <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-amber-500" /><div><p className="text-[11px] font-medium text-slate-800">Expenses</p><p className="text-[10px] leading-relaxed text-slate-500">Compare spend across reporting periods.</p></div></div>
              <div className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" /><div><p className="text-[11px] font-medium text-slate-800">Sales pipeline</p><p className="text-[10px] leading-relaxed text-slate-500">Keep opportunities moving forward.</p></div></div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-slate-400">Illustrative preview only — values are not live application data.</p>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="landing-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Business Performance CRM home">
            <Mark />
            <span className="text-sm font-semibold tracking-tight sm:text-base">Business Performance <span className="text-slate-500">CRM</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex" aria-label="Landing page">
            <a href="#platform" className="transition hover:text-slate-950">Platform</a>
            <a href="#ai-advisory" className="transition hover:text-slate-950">AI Advisory</a>
            <a href="#teams" className="transition hover:text-slate-950">For teams</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">Sign in</Link>
            <Link to="/register" className="landing-button landing-button-dark">Get started <Icon name="chevronRight" className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10 lg:py-24">
          <div className="relative z-10">
            <div className="landing-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> BUSINESS PERFORMANCE, CONNECTED</div>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.65rem]">Run your business with <span className="text-slate-500">more clarity.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Connect customer relationships, sales activity, and financial performance in one workspace — with an AI advisory direction built around your business context and your own provider key.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="landing-button landing-button-dark landing-button-large">Create your workspace <Icon name="arrowUp" className="h-4 w-4 rotate-45" /></Link>
              <a href="#platform" className="landing-button landing-button-light landing-button-large">Explore the platform <Icon name="chevronRight" className="h-4 w-4" /></a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-emerald-700" /> Role-based workspaces</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-emerald-700" /> Business-focused reporting</span>
              <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-emerald-700" /> BYOK-oriented AI advisory</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-2xl lg:ml-auto">
            <div className="landing-preview-orbit landing-preview-orbit-one" />
            <div className="landing-preview-orbit landing-preview-orbit-two" />
            <DashboardPreview />
            <div className="landing-floating-note"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon name="chart" className="h-4 w-4" /></span><span><strong className="block text-xs font-semibold text-slate-900">One business picture</strong><span className="mt-0.5 block text-[10px] text-slate-500">Sales + finance + operations</span></span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/80">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-7 sm:grid-cols-3 sm:px-8">
          <div className="flex items-center gap-3"><span className="landing-stat-icon"><Icon name="users" className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-slate-900">Customer relationships</p><p className="text-xs text-slate-500">Leads, customers and opportunities</p></div></div>
          <div className="flex items-center gap-3"><span className="landing-stat-icon"><Icon name="receipt" className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-slate-900">Financial visibility</p><p className="text-xs text-slate-500">Invoices, payments and expenses</p></div></div>
          <div className="flex items-center gap-3"><span className="landing-stat-icon"><Icon name="target" className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-slate-900">Decision support</p><p className="text-xs text-slate-500">Performance reporting and advisory</p></div></div>
        </div>
      </section>

      <section id="platform" className="landing-section">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="max-w-2xl"><p className="landing-section-label">THE PLATFORM</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Less scattered information. Better-informed conversations.</h2><p className="mt-5 text-base leading-7 text-slate-600">A practical operating view for teams that need to understand what is happening across customers, sales, and money movement.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.slice(0, 2).map((feature) => <article key={feature.number} className="landing-feature-card"><div className="flex items-center justify-between"><span className="landing-feature-icon"><Icon name={feature.icon} className="h-5 w-5" /></span><span className="text-xs font-semibold tracking-widest text-slate-400">{feature.number}</span></div><h3 className="mt-7 text-lg font-semibold tracking-tight text-slate-900">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p></article>)}
            <article id="ai-advisory" className="landing-feature-card landing-feature-ai"><div className="flex items-center justify-between"><span className="landing-feature-icon landing-feature-icon-ai"><span className="landing-sparkle" aria-hidden="true">✳</span></span><span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">AI Advisory</span></div><h3 className="mt-7 text-lg font-semibold tracking-tight text-slate-900">{features[2].title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{features[2].description}</p><a href="#byok" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">Understand BYOK <Icon name="chevronRight" className="h-4 w-4" /></a></article>
          </div>
        </div>
      </section>

      <section id="byok" className="landing-byok">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div><p className="landing-section-label landing-section-label-light">AI, WITH YOUR KEY</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">Bring your own key. Keep your AI choices in your hands.</h2><p className="mt-5 max-w-xl text-base leading-7 text-slate-300">BYOK (Bring Your Own Key) is designed for teams that want to connect an AI provider using credentials they supply, rather than assume AI access is bundled into the CRM subscription.</p><div className="mt-8 space-y-4"><div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600 text-blue-300"><Icon name="check" className="h-3.5 w-3.5" /></span><div><p className="text-sm font-semibold text-white">Your provider relationship</p><p className="mt-1 text-sm leading-6 text-slate-400">Provider access, usage charges, and model availability depend on the AI service and integration configured for your deployment.</p></div></div><div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-600 text-blue-300"><Icon name="check" className="h-3.5 w-3.5" /></span><div><p className="text-sm font-semibold text-white">Advisory, not autopilot</p><p className="mt-1 text-sm leading-6 text-slate-400">Use AI-generated observations as decision support. Review the underlying business figures and apply your own judgment.</p></div></div></div></div>
          <div className="landing-advisory-panel"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white"><span aria-hidden="true">✳</span></span><div><p className="text-sm font-semibold text-slate-900">AI Advisory</p><p className="text-xs text-slate-500">Illustrative experience</p></div></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800">Review required</span></div><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Example advisory prompt</p><p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">“Review the latest revenue, expenses, and outstanding invoices. What should our team investigate first?”</p><div className="mt-5 flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon name="chart" className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-slate-900">Structured business questions</p><p className="mt-1 text-sm leading-6 text-slate-600">Frame the next steps around recorded metrics, follow-up questions, and items that deserve human review.</p></div></div><div className="mt-5 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs leading-5 text-slate-500">Illustration only. This panel is not connected to a live AI provider and contains no generated business advice.</div></div></div>
        </div>
      </section>

      <section id="teams" className="landing-section">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center"><p className="landing-section-label">BUILT AROUND YOUR TEAM</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Different responsibilities. A shared view of the business.</h2><p className="mt-5 text-base leading-7 text-slate-600">Role-based access helps each team focus on the work and information relevant to its responsibilities.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">{audiences.map((item) => <article key={item.role} className="landing-team-card"><span className="landing-feature-icon"><Icon name={item.icon} className="h-5 w-5" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400">{item.role}</p><h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p></article>)}</div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-24"><div className="landing-cta mx-auto max-w-7xl px-6 py-12 text-center sm:px-12 sm:py-16"><p className="landing-section-label">START WITH A CLEARER VIEW</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Bring your customer and financial workflows into one place.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Create a workspace for your team and explore the CRM using your own business context.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/register" className="landing-button landing-button-dark landing-button-large">Create a workspace <Icon name="chevronRight" className="h-4 w-4" /></Link><Link to="/login" className="landing-button landing-button-light landing-button-large">Sign in to your workspace</Link></div></div></section>

      <footer className="border-t border-slate-200 bg-slate-50"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between"><Link to="/" className="flex items-center gap-2.5"><Mark className="!h-8 !w-8 !rounded-lg" /><span className="text-sm font-semibold text-slate-800">Business Performance CRM</span></Link><p className="text-xs leading-5 text-slate-500">Business management and decision support. AI-generated content, where enabled, should be reviewed before use.</p><div className="flex gap-4 text-xs text-slate-500"><Link to="/login" className="hover:text-slate-900">Sign in</Link><Link to="/register" className="hover:text-slate-900">Create workspace</Link></div></div></footer>
    </main>
  );
}
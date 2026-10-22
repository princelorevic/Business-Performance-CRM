import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon.jsx';
import { InvoiceJourney } from './landing/InvoiceJourney.jsx';
import { FeatureExplorer } from './landing/FeatureExplorer.jsx';
import {
  CONTACT, mailtoHref, gmailHref, NAV_LINKS, HANDOFF, ROLE_COLUMNS, ROLE_ROWS,
  AI_SEES, AI_NEVER, ABOUT_PRINCIPLES, BUILT_WITH, FAQ,
} from './landing/content.js';
import './landing-page.css';

function Brand({ onClick }) {
  return (
    <Link to="/" onClick={onClick} className="lp-brand" aria-label="Business Performance CRM home">
      <span className="lp-brand-mark" aria-hidden="true"><Icon name="chart" className="h-5 w-5" /></span>
      <span>Business Performance CRM</span>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header-row">
        <Brand onClick={close} />
        <nav className="lp-nav" aria-label="Page sections">
          {NAV_LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <div className="lp-header-actions">
          <Link to="/login" className="lp-link-quiet">Sign in</Link>
          <Link to="/register" className="lp-btn lp-btn-primary">Get started</Link>
          <button
            type="button"
            className="lp-menu-btn"
            aria-expanded={open}
            aria-controls="lp-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <nav id="lp-mobile-nav" className="lp-mobile-nav" aria-label="Page sections">
          {NAV_LINKS.map((l) => <a key={l.href} href={l.href} onClick={close}>{l.label}</a>)}
          <Link to="/login" onClick={close}>Sign in</Link>
        </nav>
      )}
    </header>
  );
}

export function LandingPage() {
  return (
    <main className="landing-page">
      <a href="#features" className="lp-skip">Skip to features</a>
      <Header />

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <h1 className="lp-h1">Run your business with more clarity.</h1>
            <p className="lp-lead">Business Performance CRM ties your sales to your money. A deal becomes an invoice, the invoice becomes a payment, and the dashboard shows what that did to your revenue, cash and profit.</p>
            <div className="lp-cta-row">
              <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">Create your workspace</Link>
              <a href="#features" className="lp-btn lp-btn-quiet lp-btn-lg">See what is inside</a>
            </div>
            <ul className="lp-facts">
              <li><Icon name="check" className="h-4 w-4" /> 14-day trial for every new workspace</li>
              <li><Icon name="check" className="h-4 w-4" /> Separate views for CEO/COO, Finance and Sales</li>
              <li><Icon name="check" className="h-4 w-4" /> Every dashboard figure traces back to a record</li>
            </ul>
          </div>
          <InvoiceJourney />
        </div>
      </section>

      <section id="features" className="lp-block">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2">Everything from first contact to final payment</h2>
            <p className="lp-sub">Four areas, one set of records. Pick a group to see what it covers.</p>
          </div>
          <FeatureExplorer />
        </div>
      </section>

      <section id="how-it-works" className="lp-block lp-block-tint">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2">How work moves through the team</h2>
            <p className="lp-sub">Sales and Finance hand off at the invoice, so nobody edits numbers they should not touch.</p>
          </div>
          <ol className="lp-steps">
            {HANDOFF.map((s, i) => (
              <li key={s.title} className="lp-step">
                <span className="lp-step-n" aria-hidden="true">{i + 1}</span>
                <p className="lp-step-who">{s.who}</p>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="roles" className="lp-block">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2">Each role sees what its job needs</h2>
            <p className="lp-sub">Access is enforced on the server, not just hidden in the menu.</p>
          </div>
          <div className="lp-table-wrap" tabIndex={0} role="region" aria-label="Role permissions table, scrolls sideways on small screens">
            <table className="lp-table">
              <caption className="sr-only">What each role can do</caption>
              <thead>
                <tr><th scope="col">Area</th>{ROLE_COLUMNS.map((c) => <th scope="col" key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {ROLE_ROWS.map((r) => (
                  <tr key={r.what}>
                    <th scope="row">{r.what}</th>
                    {r.cells.map((c, i) => (
                      <td key={ROLE_COLUMNS[i]} className={c ? '' : 'is-none'}>{c ?? <><span aria-hidden="true">–</span><span className="sr-only">No access</span></>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="ai-advisor" className="lp-ai">
        <div className="lp-wrap lp-ai-grid">
          <div>
            <p className="lp-badge">Coming soon</p>
            <h2 className="lp-h2 lp-on-dark">An AI advisor that uses your own API key</h2>
            <p className="lp-ai-lead">Ask what to do when sales drop, and get suggestions tied to your own figures. Each company connects its own OpenAI, Anthropic or Google key, so you choose the provider and control the cost.</p>
            <p className="lp-ai-fine">The advisor is for business questions only, and it supports your judgment rather than replacing it. Your key is stored encrypted and is shown back to you only as its last four characters.</p>
          </div>
          <div className="lp-ai-lists">
            <div>
              <h3>What it can see</h3>
              <ul>{AI_SEES.map((t) => <li key={t}><Icon name="check" className="h-4 w-4" />{t}</li>)}</ul>
            </div>
            <div>
              <h3>What it never receives</h3>
              <ul>{AI_NEVER.map((t) => <li key={t}><Icon name="close" className="h-4 w-4" />{t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="lp-block">
        <div className="lp-wrap lp-about-grid">
          <div>
            <h2 className="lp-h2">About the system</h2>
            <p className="lp-body">Most small-business tools keep contacts in one place and the books in another. Business Performance CRM keeps them in one chain: a won deal, its invoice, the payment that settled it, and the profit that followed.</p>
            <p className="lp-body">It is built for owners and managers who want a clear answer to one question: how is the business doing, and why? Every figure on the dashboard comes from records your team entered, so you can open the invoice behind any number.</p>
            <p className="lp-body">It is a full-stack web application, and each company gets its own isolated workspace.</p>
            <h3 className="lp-h3">Built with</h3>
            <ul className="lp-tags">{BUILT_WITH.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div>
            <h3 className="lp-h3">How it is built to be trusted</h3>
            <ul className="lp-principles">
              {ABOUT_PRINCIPLES.map((p) => <li key={p}><Icon name="shield" className="h-5 w-5" /><span>{p}</span></li>)}
            </ul>
            <div className="lp-note">
              <h3>What it is not</h3>
              <p>It is a management reporting tool, not accounting software. It supports one currency per company, does not handle tax, and has no online payment gateway.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="lp-block lp-block-tint">
        <div className="lp-wrap lp-faq-grid">
          <div className="lp-head">
            <h2 className="lp-h2">Questions people ask first</h2>
            <p className="lp-sub">Can’t find yours? Use the contact details below.</p>
          </div>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary><span>{f.q}</span><Icon name="chevronRight" className="lp-faq-icon h-5 w-5" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="lp-block">
        <div className="lp-wrap">
          <div className="lp-head">
            <h2 className="lp-h2">Talk to us</h2>
            <p className="lp-sub">Ask about the platform, request a walkthrough or share feedback.</p>
          </div>
          <div className="lp-contact">
            <article className="lp-contact-card">
              <span className="lp-contact-icon"><Icon name="mail" className="h-5 w-5" /></span>
              <h3>Email</h3>
              <a href={mailtoHref} className="lp-contact-main">{CONTACT.email}</a>
              <div className="lp-cta-row">
                <a href={mailtoHref} className="lp-btn lp-btn-primary">Send an email</a>
                <a href={gmailHref} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-quiet">Open in Gmail<span className="sr-only"> (opens in a new tab)</span></a>
              </div>
            </article>
            <article className="lp-contact-card">
              <span className="lp-contact-icon"><Icon name="phone" className="h-5 w-5" /></span>
              <h3>Phone</h3>
              <a href={CONTACT.phoneHref} className="lp-contact-main">{CONTACT.phoneDisplay}</a>
              <div className="lp-cta-row"><a href={CONTACT.phoneHref} className="lp-btn lp-btn-quiet">Call now</a></div>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap lp-final-row">
          <h2 className="lp-h2 lp-on-dark">Start with a clearer view of your business.</h2>
          <div className="lp-cta-row">
            <Link to="/register" className="lp-btn lp-btn-light lp-btn-lg">Create your workspace</Link>
            <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Sign in</Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <Brand />
          <p>Management reporting and decision support. AI-generated suggestions, when enabled, should be reviewed before you act on them.</p>
          <nav aria-label="Footer">
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create workspace</Link>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

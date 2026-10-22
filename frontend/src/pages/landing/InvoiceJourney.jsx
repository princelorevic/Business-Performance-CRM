import { useState } from 'react';
import { INVOICE_TOTAL, JOURNEY } from './content.js';

const peso = (n) => `₱${n.toLocaleString('en-PH')}`;

// The hero's interactive moment: follow one example invoice and watch revenue, cash and
// receivables move. It teaches the core rule of the system (invoices create revenue,
// payments create cash) by letting the visitor do it.
export function InvoiceJourney() {
  const [step, setStep] = useState(0);
  const s = JOURNEY[step];
  const owed = s.revenue - s.cash;
  const next = () => setStep((i) => (i + 1) % JOURNEY.length);

  const meters = [
    { id: 'revenue', label: 'Revenue', value: s.revenue, hint: 'Counted when issued' },
    { id: 'cash', label: 'Cash received', value: s.cash, hint: 'Counted when paid' },
    { id: 'owed', label: 'Owed to you', value: owed, hint: 'Issued but unpaid' },
  ];

  return (
    <section className="lp-journey" aria-labelledby="lp-journey-title">
      <div className="lp-journey-head">
        <h2 id="lp-journey-title" className="lp-journey-title">Follow one invoice</h2>
        <span className="lp-muted">Example figures</span>
      </div>

      <div className="lp-slip">
        <div>
          <p className="lp-slip-no">INV-000123</p>
          <p className="lp-muted">Example Customer</p>
        </div>
        <div className="lp-slip-right">
          <p className="lp-slip-amount">{peso(INVOICE_TOTAL)}</p>
          <p className={`lp-chip lp-chip-${s.key}`}>{s.status}</p>
        </div>
      </div>

      <div role="group" aria-label="Invoice stage" className="lp-stages">
        {JOURNEY.map((j, i) => (
          <button
            key={j.key}
            type="button"
            onClick={() => setStep(i)}
            aria-current={i === step ? 'step' : undefined}
            className={`lp-stage ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}
          >
            {j.tab}
          </button>
        ))}
      </div>

      <div className="lp-meters">
        {meters.map((m) => (
          <div key={m.id} className="lp-meter">
            <div className="lp-meter-row">
              <span className="lp-meter-label">{m.label}</span>
              <span className="lp-meter-value">{peso(m.value)}</span>
            </div>
            <div className="lp-meter-track" aria-hidden="true">
              <span className={`lp-meter-fill lp-fill-${m.id}`} style={{ width: `${(m.value / INVOICE_TOTAL) * 100}%` }} />
            </div>
            <span className="lp-meter-hint">{m.hint}</span>
          </div>
        ))}
      </div>

      <p className="lp-journey-note" aria-live="polite"><strong>{s.actor}:</strong> {s.note}</p>
      <button type="button" className="lp-btn lp-btn-primary lp-btn-block" onClick={next}>{s.action}</button>
    </section>
  );
}

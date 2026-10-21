import { useRef } from 'react';
import { useTheme } from './ThemeProvider.jsx';
import { Icon } from '../components/ui/Icon.jsx';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

// Accessible radio group: arrow keys move selection, selected option is announced.
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = (index + step + OPTIONS.length) % OPTIONS.length;
    setPreference(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {OPTIONS.map((o, i) => {
        const selected = preference === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${o.label} theme`}
            title={`${o.label} theme`}
            tabIndex={selected ? 0 : -1}
            onClick={() => setPreference(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${selected ? 'bg-surface text-accent shadow-card' : 'text-muted hover:text-text'}`}
          >
            <Icon name={o.icon} className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

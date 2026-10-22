import { useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon.jsx';
import { FEATURE_GROUPS } from './content.js';

// Tabbed feature index. Arrow keys move between groups, per the WAI-ARIA tabs pattern.
export function FeatureExplorer() {
  const [active, setActive] = useState(FEATURE_GROUPS[0].id);
  const refs = useRef({});
  const group = FEATURE_GROUPS.find((g) => g.id === active);

  const onKeyDown = (e, index) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const target = FEATURE_GROUPS[e.key === 'Home' ? 0 : FEATURE_GROUPS.length - 1].id;
      setActive(target); refs.current[target]?.focus();
      return;
    }
    if (!(e.key in keys)) return;
    e.preventDefault();
    const target = FEATURE_GROUPS[(index + keys[e.key] + FEATURE_GROUPS.length) % FEATURE_GROUPS.length].id;
    setActive(target); refs.current[target]?.focus();
  };

  return (
    <div className="lp-explorer">
      <div role="tablist" aria-label="Feature groups" aria-orientation="vertical" className="lp-tabs">
        {FEATURE_GROUPS.map((g, i) => (
          <button
            key={g.id}
            ref={(el) => { refs.current[g.id] = el; }}
            role="tab"
            id={`tab-${g.id}`}
            type="button"
            aria-selected={active === g.id}
            aria-controls={`panel-${g.id}`}
            tabIndex={active === g.id ? 0 : -1}
            onClick={() => setActive(g.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="lp-tab"
          >
            <Icon name={g.icon} className="h-5 w-5" />
            <span><strong>{g.title}</strong><small>{g.blurb}</small></span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${group.id}`} aria-labelledby={`tab-${group.id}`} tabIndex={0} className="lp-panel">
        <dl>
          {group.items.map((it) => (
            <div key={it.name} className="lp-panel-row">
              <dt>{it.name}</dt>
              <dd>{it.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

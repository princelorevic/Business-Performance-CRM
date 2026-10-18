import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_KEY, normalizePreference, resolveTheme } from './resolveTheme.js';

const ThemeContext = createContext(null);
const query = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference() {
  try { return normalizePreference(localStorage.getItem(THEME_KEY)); } catch { return 'system'; }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => query().matches);
  const theme = resolveTheme(preference, systemDark);

  useEffect(() => { apply(theme); }, [theme]);

  // In "system" mode, follow OS changes live.
  useEffect(() => {
    const mq = query();
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((value) => {
    const next = normalizePreference(value);
    setPreferenceState(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable: preference lasts for this session */ }
  }, []);

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

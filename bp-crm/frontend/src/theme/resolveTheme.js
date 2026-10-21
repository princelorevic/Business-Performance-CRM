// Pure theme logic (no DOM) so it can be unit-tested. Mirrored by the inline script in index.html.
export const THEME_KEY = 'bp-theme';
export const PREFERENCES = ['light', 'dark', 'system'];

export function normalizePreference(value) {
  return PREFERENCES.includes(value) ? value : 'system';
}

export function resolveTheme(preference, systemPrefersDark) {
  const pref = normalizePreference(preference);
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

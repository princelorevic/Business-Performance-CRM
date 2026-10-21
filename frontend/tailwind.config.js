// All colors come from CSS variables (src/styles/tokens.css) so every component
// themes itself automatically in light and dark mode.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), 'surface-2': v('surface-2'), border: v('border'),
        text: v('text'), muted: v('muted'),
        accent: v('accent'), 'accent-fg': v('accent-fg'), 'accent-soft': v('accent-soft'),
        success: v('success'), warning: v('warning'), danger: v('danger'), info: v('info'),
        'success-soft': v('success-soft'), 'warning-soft': v('warning-soft'), 'danger-soft': v('danger-soft'), 'info-soft': v('info-soft'),
      },
      boxShadow: { card: 'var(--shadow-card)', pop: 'var(--shadow-pop)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      borderRadius: { xl: '0.875rem' },
    },
  },
  plugins: [],
};

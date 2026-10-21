import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeProvider.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const mount = () => render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

describe('theme selector', () => {
  beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });

  test('defaults to system and resolves to light when the OS is light', () => {
    mount();
    expect(screen.getByRole('radio', { name: 'System theme' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  test('choosing dark applies it to the document and persists it', async () => {
    mount();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('bp-theme')).toBe('dark');
  });

  test('a stored preference is restored on load', () => {
    localStorage.setItem('bp-theme', 'dark');
    mount();
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('arrow keys move between options', async () => {
    mount();
    screen.getByRole('radio', { name: 'System theme' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Light theme' })).toBeChecked();
  });

  test('corrupted storage falls back to system', () => {
    localStorage.setItem('bp-theme', 'purple');
    mount();
    expect(screen.getByRole('radio', { name: 'System theme' })).toBeChecked();
  });
});

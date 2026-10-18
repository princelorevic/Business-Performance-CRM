import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, normalizePreference } from './resolveTheme.js';

test('explicit light/dark ignore the OS setting', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('system follows the OS setting', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('unknown or corrupted stored values fall back to system', () => {
  for (const bad of [null, undefined, '', 'blue', 42, '{"x":1}']) assert.equal(normalizePreference(bad), 'system');
  assert.equal(resolveTheme('blue', true), 'dark');
});

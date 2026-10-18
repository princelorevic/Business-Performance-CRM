import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, formatPercent, formatPlainPercent, formatDate, humanize } from './format.js';

test('money formats and handles missing values', () => {
  assert.equal(formatMoney('1234.5'), '$1,234.50');
  assert.equal(formatMoney('-5'), '-$5.00');
  assert.equal(formatMoney(null), '—');
  assert.equal(formatMoney('abc'), '—');
});

test('null percentages render as a dash, never 0% or Infinity', () => {
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent('12.345'), '+12.3%');
  assert.equal(formatPercent('-4'), '-4.0%');
  assert.equal(formatPlainPercent(null), '—');
  assert.equal(formatPlainPercent('66.67'), '66.7%');
});

test('dates are timezone-stable', () => {
  assert.equal(formatDate('2026-10-17'), 'Oct 17, 2026');
  assert.equal(formatDate('2026-10-17T23:59:00Z'), 'Oct 17, 2026');
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate('garbage'), '—');
});

test('humanize', () => assert.equal(humanize('partially_paid'), 'Partially paid'));

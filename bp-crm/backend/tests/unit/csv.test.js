import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../../src/utils/csv.js';

test('escapes commas, quotes and newlines', () => {
  const out = toCsv(['a'], [{ a: 'x,"y"\nz' }]);
  assert.equal(out, 'a\n"x,""y""\nz"\n');
});

test('neutralizes spreadsheet formula injection but keeps negative numbers', () => {
  const out = toCsv(['a'], [{ a: '=HYPERLINK("http://evil")' }, { a: '@cmd' }, { a: '-12.50' }, { a: '+1+1' }], '10.00');
  const lines = out.trim().split('\n');
  assert.ok(lines[1].startsWith('"\'=') || lines[1].startsWith("'="));
  assert.ok(lines[2].startsWith("'@"));
  assert.equal(lines[3], '-12.50');
  assert.ok(lines[4].startsWith("'+"));
  assert.equal(lines[5], 'Total,10.00');
});

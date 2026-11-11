import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRatios, formatRatio } from '../src/ratio.js';

test('formatRatio rounds half up', () => {
  assert.equal(formatRatio(1, 8, 2), '0.13');
  assert.equal(formatRatio(1, 3, 4), '0.3333');
  assert.equal(formatRatio(2, 3, 4), '0.6667');
  assert.equal(formatRatio(5, 1, 2), '5.00');
  assert.equal(formatRatio(7, 2, 0), '4');
});

test('formatRatio rounds a value that floating point would get wrong', () => {
  // 1.005 is stored as 1.00499999... as a double, so (1.005).toFixed(2) gives "1.00".
  assert.equal(formatRatio(1005, 1000, 2), '1.01');
});

test('formatRatio handles values beyond the safe integer range', () => {
  assert.equal(formatRatio(10n ** 20n, 3n, 2), '33333333333333333333.33');
});

test('compareRatios orders fractions exactly', () => {
  assert.equal(compareRatios(1, 3, 2, 6), 0);
  assert.equal(compareRatios(1, 3, 1, 2), -1);
  assert.equal(compareRatios(3, 4, 2, 3), 1);
});

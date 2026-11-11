import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INVALID, isValidDate, parseCount, parseSpend } from '../src/values.js';

const onText = (parse) => (text) => {
  const buffer = Buffer.from(text);
  return parse(buffer, 0, buffer.length);
};
const count = onText(parseCount);
const spend = onText(parseSpend);
const date = onText(isValidDate);

test('parseCount reads non-negative integers', () => {
  assert.equal(count('0'), 0);
  assert.equal(count('12000'), 12000);
  assert.equal(count('999999999999999'), 999999999999999);
});

test('parseCount rejects anything else', () => {
  for (const text of ['', '-1', '1.5', '1e3', '12a', '+5', '1000000000000000']) {
    assert.equal(count(text), INVALID, text);
  }
});

test('parseSpend converts decimals to micro-dollars exactly', () => {
  assert.equal(spend('45.50'), 45_500_000);
  assert.equal(spend('0.1'), 100_000);
  assert.equal(spend('7'), 7_000_000);
  assert.equal(spend('7.'), 7_000_000);
  assert.equal(spend('.25'), 250_000);
  assert.equal(spend('0.123456'), 123_456);
});

test('parseSpend rounds past six decimals half up', () => {
  assert.equal(spend('0.0000005'), 1);
  assert.equal(spend('0.0000004'), 0);
  assert.equal(spend('1.99999949'), 1_999_999);
});

test('parseSpend rejects anything else', () => {
  for (const text of ['', '.', '-1.00', '1.2.3', 'abc', '1,5', '1e2', '1000000000.00']) {
    assert.equal(spend(text), INVALID, text);
  }
});

test('isValidDate accepts real YYYY-MM-DD dates', () => {
  for (const text of ['2025-01-01', '2025-12-31', '2024-02-29', '2000-02-29']) {
    assert.equal(date(text), true, text);
  }
});

test('isValidDate rejects bad formats and impossible dates', () => {
  for (const text of ['2025-1-01', '2025/01/01', '2025-13-01', '2025-00-10', '2025-02-29', '1900-02-29', '2025-04-31', '']) {
    assert.equal(date(text), false, text);
  }
});

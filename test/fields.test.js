import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BROKEN_QUOTES, decodeField, splitFields } from '../src/fields.js';

function split(line, maxFields = 6) {
  const buffer = Buffer.from(line);
  const bounds = new Int32Array(2 * maxFields);
  const count = splitFields(buffer, 0, buffer.length, bounds, maxFields);
  if (count < 0 || count > maxFields) {
    return count;
  }
  return Array.from({ length: count }, (_, k) => decodeField(buffer, bounds[2 * k], bounds[2 * k + 1]));
}

test('splits plain fields', () => {
  assert.deepEqual(split('CMP001,2025-01-01,12000,300,45.50,12'), ['CMP001', '2025-01-01', '12000', '300', '45.50', '12']);
});

test('trims spaces and tabs around fields', () => {
  assert.deepEqual(split(' a ,\tb\t, c', 3), ['a', 'b', 'c']);
});

test('keeps empty fields, including a trailing one', () => {
  assert.deepEqual(split('a,,b,', 4), ['a', '', 'b', '']);
});

test('handles quoted fields with commas and escaped quotes', () => {
  assert.deepEqual(split('"CMP, ""west""",2025-01-01', 2), ['CMP, "west"', '2025-01-01']);
});

test('reports too many fields as maxFields + 1', () => {
  assert.equal(split('a,b,c,d', 3), 4);
});

test('reports an unclosed quote', () => {
  assert.equal(split('"abc,1', 2), BROKEN_QUOTES);
});

test('reports text after a closing quote', () => {
  assert.equal(split('"abc"x,1', 2), BROKEN_QUOTES);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forEachLine } from '../src/line-splitter.js';

async function collectLines(chunks) {
  const lines = [];
  await forEachLine(chunks.map((chunk) => Buffer.from(chunk)), (buffer, start, end) => {
    lines.push(buffer.toString('utf8', start, end));
  });
  return lines;
}

test('splits LF and CRLF terminated lines', async () => {
  assert.deepEqual(await collectLines(['a,1\nb,2\r\nc,3\n']), ['a,1', 'b,2', 'c,3']);
});

test('emits the last line when there is no trailing newline', async () => {
  assert.deepEqual(await collectLines(['a\nb']), ['a', 'b']);
});

test('joins a line split across chunks', async () => {
  assert.deepEqual(await collectLines(['he', 'llo\nwor', 'ld\n']), ['hello', 'world']);
});

test('joins a line spread over many chunks', async () => {
  assert.deepEqual(await collectLines(['a', 'b', 'c', 'd\ne']), ['abcd', 'e']);
});

test('strips CR when CRLF is split across chunks', async () => {
  assert.deepEqual(await collectLines(['abc\r', '\ndef\r\n']), ['abc', 'def']);
});

test('reports blank lines as empty ranges', async () => {
  assert.deepEqual(await collectLines(['a\n\nb\n']), ['a', '', 'b']);
});

test('produces nothing for empty input', async () => {
  assert.deepEqual(await collectLines([]), []);
});

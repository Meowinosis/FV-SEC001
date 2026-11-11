import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(projectRoot, 'test', 'fixtures');
const outputDir = mkdtempSync(path.join(tmpdir(), 'ad-aggregator-'));

after(() => rmSync(outputDir, { recursive: true, force: true }));

function runCli(...args) {
  return spawnSync(process.execPath, [path.join(projectRoot, 'aggregator.js'), ...args], { encoding: 'utf8' });
}

test('writes both reports matching the expected files', () => {
  const result = runCli('--input', path.join(fixtures, 'sample.csv'), '--output', outputDir);

  assert.equal(result.status, 0, result.stderr);
  for (const fileName of ['top10_ctr.csv', 'top10_cpa.csv']) {
    const actual = readFileSync(path.join(outputDir, fileName), 'utf8');
    const expected = readFileSync(path.join(fixtures, 'expected', fileName), 'utf8');
    assert.equal(actual, expected, fileName);
  }
  assert.match(result.stdout, /Rows read: +10\n/);
  assert.match(result.stdout, /Rows skipped: +3\n/);
  assert.match(result.stderr, /skipped 3 malformed row\(s\)/);
  assert.match(result.stderr, /line 9: invalid impressions/);
});

test('fails with exit code 1 when the input file is missing', () => {
  const result = runCli('--input', 'missing.csv', '--output', outputDir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Error: Input file not found: missing.csv/);
});

test('fails with exit code 2 when --input is not given', () => {
  const result = runCli();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required option --input/);
});

test('fails with exit code 2 on an unknown option', () => {
  const result = runCli('--input', 'x.csv', '--bogus');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});

test('prints usage with --help', () => {
  const result = runCli('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node aggregator.js/);
});

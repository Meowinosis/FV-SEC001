import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateFile, aggregateStream, CampaignTotals, parseHeader } from '../src/aggregate.js';

const HEADER = 'campaign_id,date,impressions,clicks,spend,conversions';

function aggregateText(text, chunkSize = text.length || 1) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(Buffer.from(text.slice(i, i + chunkSize)));
  }
  return aggregateStream(chunks);
}

function totalsOf(result, campaignId) {
  const totals = result.campaigns.get(campaignId);
  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    spendMicros: totals.spendMicros,
    conversions: totals.conversions,
  };
}

test('sums every metric per campaign', async () => {
  const result = await aggregateText(
    `${HEADER}\nCMP001,2025-01-01,12000,300,45.50,12\nCMP002,2025-01-01,8000,120,28.00,4\nCMP001,2025-01-02,14000,340,48.20,15\n`,
  );
  assert.equal(result.dataRows, 3);
  assert.equal(result.malformed.count, 0);
  assert.deepEqual(totalsOf(result, 'CMP001'), { impressions: 26000, clicks: 640, spendMicros: 93_700_000n, conversions: 27 });
  assert.deepEqual(totalsOf(result, 'CMP002'), { impressions: 8000, clicks: 120, spendMicros: 28_000_000n, conversions: 4 });
});

test('gives the same result whatever the chunk size', async () => {
  const text = `${HEADER}\r\nCMP001,2025-01-01,10,1,0.10,1\r\nCMP001,2025-01-02,20,2,0.20,0\r\n`;
  for (const chunkSize of [1, 2, 7, 64]) {
    const result = await aggregateText(text, chunkSize);
    assert.deepEqual(totalsOf(result, 'CMP001'), { impressions: 30, clicks: 3, spendMicros: 300_000n, conversions: 1 });
  }
});

test('sums spend exactly where floating point would drift', async () => {
  const rows = Array.from({ length: 1000 }, () => 'CMP001,2025-01-01,1,0,0.10,0').join('\n');
  const result = await aggregateText(`${HEADER}\n${rows}\n`);
  assert.equal(totalsOf(result, 'CMP001').spendMicros, 100_000_000n);
});

test('skips malformed rows and records why', async () => {
  const result = await aggregateText(
    [
      HEADER,
      'CMP001,2025-01-01,100,10,1.00,1',
      'CMP001,2025-01-01,abc,10,1.00,1',
      'CMP001,2025-01-01,100,-1,1.00,1',
      'CMP001,2025-01-01,100,10,free,1',
      'CMP001,2025-01-01,100,10,1.00,1.5',
      'CMP001,2025-02-30,100,10,1.00,1',
      ',2025-01-01,100,10,1.00,1',
      'CMP001,2025-01-01,100,10',
      '"CMP001,2025-01-01,100,10,1.00,1',
      '',
    ].join('\n'),
  );

  assert.equal(result.dataRows, 9);
  assert.equal(result.malformed.count, 8);
  assert.deepEqual(totalsOf(result, 'CMP001'), { impressions: 100, clicks: 10, spendMicros: 1_000_000n, conversions: 1 });
  assert.deepEqual(
    result.malformed.samples.map(({ lineNumber, problem }) => [lineNumber, problem]),
    [
      [3, 'invalid impressions'],
      [4, 'invalid clicks'],
      [5, 'invalid spend'],
      [6, 'invalid conversions'],
      [7, 'invalid date'],
    ],
  );
});

test('accepts reordered and extra columns, a BOM and a quoted header', async () => {
  const result = await aggregateText('﻿"spend",conversions,campaign_id,region,date,clicks,impressions\n2.50,1,CMP009,EU,2025-01-01,5,50\n');
  assert.deepEqual(totalsOf(result, 'CMP009'), { impressions: 50, clicks: 5, spendMicros: 2_500_000n, conversions: 1 });
});

test('accepts quoted campaign ids', async () => {
  const result = await aggregateText(`${HEADER}\n"CMP ""A"", West",2025-01-01,10,1,1.00,1\n`);
  assert.deepEqual([...result.campaigns.keys()], ['CMP "A", West']);
});

test('rejects a header that lacks required columns', () => {
  assert.throws(() => parseHeader('campaign_id,date,impressions'), /missing required column\(s\): clicks, spend, conversions/);
});

test('rejects empty input', async () => {
  await assert.rejects(aggregateText(''), /Input is empty/);
  await assert.rejects(aggregateText('\n\n'), /Input is empty/);
});

test('rejects a missing input file with a clear message', async () => {
  await assert.rejects(aggregateFile('does-not-exist.csv'), /Input file not found: does-not-exist.csv/);
});

test('rejects a directory as input', async () => {
  await assert.rejects(aggregateFile('test'), /Input path is not a file/);
});

test('keeps spend exact past the Number safe integer range', () => {
  const totals = new CampaignTotals();
  const nearMaxRowSpend = 999_999_999_999_999;
  for (let i = 0; i < 20; i += 1) {
    totals.add(0, 0, nearMaxRowSpend, 0);
  }
  assert.equal(totals.spendMicros, 20n * BigInt(nearMaxRowSpend));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectTop, summarize, topByCpa, topByCtr } from '../src/ranking.js';

function campaign(campaignId, impressions, clicks, spendDollars, conversions) {
  return { campaignId, impressions, clicks, spendMicros: BigInt(spendDollars * 1_000_000), conversions };
}

const ids = (summaries) => summaries.map((summary) => summary.campaignId);

test('topByCtr sorts by CTR descending and leaves out campaigns without impressions', () => {
  const summaries = [
    campaign('A', 1000, 10, 1, 1),
    campaign('B', 1000, 50, 1, 1),
    campaign('C', 0, 0, 1, 1),
    campaign('D', 1000, 30, 1, 0),
  ];
  assert.deepEqual(ids(topByCtr(summaries, 10)), ['B', 'D', 'A']);
});

test('topByCpa sorts by CPA ascending and leaves out campaigns without conversions', () => {
  const summaries = [
    campaign('A', 1, 1, 100, 10),
    campaign('B', 1, 1, 100, 0),
    campaign('C', 1, 1, 30, 10),
    campaign('D', 1, 1, 50, 2),
  ];
  assert.deepEqual(ids(topByCpa(summaries, 10)), ['C', 'A', 'D']);
});

test('ties are broken by campaign_id', () => {
  const summaries = [campaign('Z', 100, 5, 10, 1), campaign('M', 200, 10, 20, 2), campaign('A', 300, 15, 30, 3)];
  assert.deepEqual(ids(topByCtr(summaries, 10)), ['A', 'M', 'Z']);
  assert.deepEqual(ids(topByCpa(summaries, 10)), ['A', 'M', 'Z']);
});

test('results are limited to the requested count', () => {
  const summaries = Array.from({ length: 25 }, (_, i) => campaign(`CMP${String(i).padStart(2, '0')}`, 1000, i, i + 1, 1));
  const top = topByCtr(summaries, 10);
  assert.equal(top.length, 10);
  assert.equal(top[0].campaignId, 'CMP24');
  assert.equal(top[9].campaignId, 'CMP15');
});

test('selectTop matches a full sort', () => {
  const values = Array.from({ length: 500 }, (_, i) => (i * 7919) % 1000);
  const ascending = (a, b) => a - b;
  assert.deepEqual(selectTop(values, 10, ascending), [...values].sort(ascending).slice(0, 10));
  assert.deepEqual(selectTop(values, 0, ascending), []);
});

test('summarize refuses totals that are no longer exact', () => {
  const unsafeTotals = { impressions: Number.MAX_SAFE_INTEGER + 2, clicks: 0, conversions: 0, spendMicros: 0n };
  assert.throws(() => summarize(new Map([['CMP001', unsafeTotals]])), /too large to sum exactly/);
});

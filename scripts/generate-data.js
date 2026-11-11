#!/usr/bin/env node
/**
 * Writes a synthetic ad_data.csv for benchmarking. The output is deterministic for a given seed.
 *
 *   node scripts/generate-data.js --rows 26000000 --campaigns 50 --output ad_data.csv
 */
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    rows: { type: 'string', default: '26000000' },
    campaigns: { type: 'string', default: '50' },
    seed: { type: 'string', default: '42' },
    output: { type: 'string', default: 'ad_data.csv' },
  },
});

const rowCount = Number(values.rows);
const campaignCount = Number(values.campaigns);
const ROWS_PER_WRITE = 10_000;
const DAY_MS = 86_400_000;

/** Mulberry32: a small, fast PRNG that is good enough for test data. */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(Number(values.seed));
const idWidth = Math.max(3, String(campaignCount).length);
const campaignIds = Array.from({ length: campaignCount }, (_, i) => `CMP${String(i + 1).padStart(idWidth, '0')}`);
const dates = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2025, 0, 1) + i * DAY_MS).toISOString().slice(0, 10));

const output = createWriteStream(values.output);
output.write('campaign_id,date,impressions,clicks,spend,conversions\n');

let batch = '';
for (let row = 1; row <= rowCount; row += 1) {
  const campaignId = campaignIds[Math.floor(random() * campaignCount)];
  const date = dates[Math.floor(random() * dates.length)];
  const impressions = 1000 + Math.floor(random() * 20000);
  const clicks = Math.floor(impressions * random() * 0.05);
  const spend = (clicks * (0.1 + random() * 0.5)).toFixed(2);
  const conversions = Math.floor(clicks * random() * 0.1);
  batch += `${campaignId},${date},${impressions},${clicks},${spend},${conversions}\n`;

  if (row % ROWS_PER_WRITE === 0 || row === rowCount) {
    if (!output.write(batch)) {
      await once(output, 'drain');
    }
    batch = '';
  }
}

output.end();
await once(output, 'finish');
console.log(`Wrote ${rowCount.toLocaleString('en-US')} rows to ${values.output}`);

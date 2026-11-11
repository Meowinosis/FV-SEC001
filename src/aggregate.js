import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { forEachLine } from './line-splitter.js';
import { BROKEN_QUOTES, decodeField, splitFields } from './fields.js';
import { INVALID, isValidDate, parseCount, parseSpend } from './values.js';

export const REQUIRED_COLUMNS = ['campaign_id', 'date', 'impressions', 'clicks', 'spend', 'conversions'];

/** 1 MiB reads keep syscalls few while memory stays flat regardless of file size. */
const READ_CHUNK_BYTES = 1 << 20;

const MAX_MALFORMED_SAMPLES = 5;

/**
 * The running spend sum is moved into a BigInt before it can lose precision.
 * A single row adds less than 10^15, so the Number never passes 2^53 (about 9.007 * 10^15).
 */
const SPEND_FLUSH_THRESHOLD = 4e15;

/** Running totals for one campaign. Kept as plain Numbers because this is the hot path. */
export class CampaignTotals {
  impressions = 0;
  clicks = 0;
  conversions = 0;
  #spendMicros = 0;
  #flushedSpendMicros = 0n;

  add(impressions, clicks, spendMicros, conversions) {
    this.impressions += impressions;
    this.clicks += clicks;
    this.conversions += conversions;
    this.#spendMicros += spendMicros;
    if (this.#spendMicros >= SPEND_FLUSH_THRESHOLD) {
      this.#flushedSpendMicros += BigInt(this.#spendMicros);
      this.#spendMicros = 0;
    }
  }

  get spendMicros() {
    return this.#flushedSpendMicros + BigInt(this.#spendMicros);
  }
}

/**
 * Streams the CSV at `inputPath` and sums each campaign's metrics.
 * Memory use depends on the number of campaigns, not on the size of the file.
 */
export async function aggregateFile(inputPath) {
  await assertIsFile(inputPath);
  return aggregateStream(createReadStream(inputPath, { highWaterMark: READ_CHUNK_BYTES }));
}

/**
 * Sums each campaign's metrics from `source`, an async iterable of Buffers holding CSV text.
 * Malformed rows are skipped and counted; the first few are kept for reporting.
 */
export async function aggregateStream(source) {
  const campaigns = new Map();
  const malformed = { count: 0, samples: [] };
  let dataRows = 0;
  let lineNumber = 0;
  let addRow = null;

  await forEachLine(source, (buffer, start, end) => {
    lineNumber += 1;
    if (start === end) {
      return;
    }
    if (addRow === null) {
      addRow = createRowAdder(parseHeader(buffer.toString('utf8', start, end)), campaigns);
      return;
    }

    dataRows += 1;
    const problem = addRow(buffer, start, end);
    if (problem !== null) {
      malformed.count += 1;
      if (malformed.samples.length < MAX_MALFORMED_SAMPLES) {
        malformed.samples.push({ lineNumber, problem, text: buffer.toString('utf8', start, end) });
      }
    }
  });

  if (addRow === null) {
    throw new Error('Input is empty: expected a header row');
  }
  return { campaigns, dataRows, malformed };
}

/**
 * Reads the header row and finds each required column, so the columns may come in any
 * order and extra columns are ignored.
 */
export function parseHeader(headerLine) {
  const names = headerLine
    .replace(/^﻿/, '')
    .split(',')
    .map((name) => name.trim().replace(/^"(.*)"$/, '$1').toLowerCase());

  const missing = REQUIRED_COLUMNS.filter((column) => !names.includes(column));
  if (missing.length > 0) {
    throw new Error(`Header is missing required column(s): ${missing.join(', ')}`);
  }

  const columnIndex = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, names.indexOf(column)]));
  return { columnCount: names.length, columnIndex };
}

/** Builds the per-row function: it adds a valid row to `campaigns`, or returns why the row is invalid. */
function createRowAdder({ columnCount, columnIndex }, campaigns) {
  const bounds = new Int32Array(2 * columnCount);
  const boundsOf = (column) => 2 * columnIndex[column];
  const idAt = boundsOf('campaign_id');
  const dateAt = boundsOf('date');
  const impressionsAt = boundsOf('impressions');
  const clicksAt = boundsOf('clicks');
  const spendAt = boundsOf('spend');
  const conversionsAt = boundsOf('conversions');

  return (buffer, start, end) => {
    const fieldCount = splitFields(buffer, start, end, bounds, columnCount);
    if (fieldCount === BROKEN_QUOTES) {
      return 'unbalanced quotes';
    }
    if (fieldCount !== columnCount) {
      return `expected ${columnCount} fields`;
    }

    const impressions = parseCount(buffer, bounds[impressionsAt], bounds[impressionsAt + 1]);
    if (impressions === INVALID) {
      return 'invalid impressions';
    }
    const clicks = parseCount(buffer, bounds[clicksAt], bounds[clicksAt + 1]);
    if (clicks === INVALID) {
      return 'invalid clicks';
    }
    const spendMicros = parseSpend(buffer, bounds[spendAt], bounds[spendAt + 1]);
    if (spendMicros === INVALID) {
      return 'invalid spend';
    }
    const conversions = parseCount(buffer, bounds[conversionsAt], bounds[conversionsAt + 1]);
    if (conversions === INVALID) {
      return 'invalid conversions';
    }
    if (!isValidDate(buffer, bounds[dateAt], bounds[dateAt + 1])) {
      return 'invalid date';
    }
    if (bounds[idAt] === bounds[idAt + 1]) {
      return 'empty campaign_id';
    }

    const campaignId = decodeField(buffer, bounds[idAt], bounds[idAt + 1]);
    let totals = campaigns.get(campaignId);
    if (totals === undefined) {
      totals = new CampaignTotals();
      campaigns.set(campaignId, totals);
    }
    totals.add(impressions, clicks, spendMicros, conversions);
    return null;
  };
}

async function assertIsFile(inputPath) {
  let info;
  try {
    info = await stat(inputPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    throw error;
  }
  if (!info.isFile()) {
    throw new Error(`Input path is not a file: ${inputPath}`);
  }
}

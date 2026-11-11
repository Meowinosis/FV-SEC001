import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { formatRatio } from './ratio.js';
import { MICROS_PER_UNIT } from './values.js';

const COLUMNS = [
  'campaign_id',
  'total_impressions',
  'total_clicks',
  'total_spend',
  'total_conversions',
  'CTR',
  'CPA',
];

const MICROS = BigInt(MICROS_PER_UNIT);

/**
 * Renders campaign summaries as CSV. Spend and CPA have 2 decimals, CTR has 4.
 * A missing CTR or CPA (zero impressions or zero conversions) is written as an empty cell.
 */
export function formatReport(summaries) {
  const lines = [COLUMNS.join(','), ...summaries.map(formatRow)];
  return `${lines.join('\n')}\n`;
}

/** Writes each `{ fileName: summaries }` entry into `outputDir` and returns the written paths. */
export async function writeReports(outputDir, reports) {
  await mkdir(outputDir, { recursive: true });
  const writtenPaths = [];
  for (const [fileName, summaries] of Object.entries(reports)) {
    const filePath = path.join(outputDir, fileName);
    await writeFile(filePath, formatReport(summaries));
    writtenPaths.push(filePath);
  }
  return writtenPaths;
}

function formatRow(summary) {
  const { campaignId, impressions, clicks, spendMicros, conversions } = summary;
  return [
    escapeCsv(campaignId),
    impressions,
    clicks,
    formatRatio(spendMicros, MICROS, 2),
    conversions,
    impressions > 0 ? formatRatio(clicks, impressions, 4) : '',
    conversions > 0 ? formatRatio(spendMicros, MICROS * BigInt(conversions), 2) : '',
  ].join(',');
}

function escapeCsv(value) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

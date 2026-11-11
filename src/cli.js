import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { aggregateFile } from './aggregate.js';
import { summarize, topByCpa, topByCtr } from './ranking.js';
import { writeReports } from './report.js';

const EXIT_OK = 0;
const EXIT_FAILURE = 1;
const EXIT_USAGE = 2;

const TOP_N = 10;
const SAMPLE_TEXT_LIMIT = 120;

const USAGE = `Usage: node aggregator.js --input <file.csv> [--output <dir>]

Aggregates ad performance by campaign_id and writes top10_ctr.csv and top10_cpa.csv.

Options:
  -i, --input <file>   CSV file to process (required)
  -o, --output <dir>   Directory for the result files (default: results)
  -h, --help           Show this help`;

const OPTIONS = {
  input: { type: 'string', short: 'i' },
  output: { type: 'string', short: 'o', default: 'results' },
  help: { type: 'boolean', short: 'h', default: false },
};

/** Runs the command line tool and returns its exit code. */
export async function run(argv) {
  let options;
  try {
    ({ values: options } = parseArgs({ args: argv, options: OPTIONS, strict: true }));
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return EXIT_USAGE;
  }

  if (options.help) {
    console.log(USAGE);
    return EXIT_OK;
  }
  if (!options.input) {
    console.error(`Missing required option --input\n\n${USAGE}`);
    return EXIT_USAGE;
  }

  try {
    const startedAt = performance.now();
    const { campaigns, dataRows, malformed } = await aggregateFile(options.input);
    const summaries = summarize(campaigns);
    const writtenPaths = await writeReports(options.output, {
      'top10_ctr.csv': topByCtr(summaries, TOP_N),
      'top10_cpa.csv': topByCpa(summaries, TOP_N),
    });
    const elapsedSeconds = (performance.now() - startedAt) / 1000;

    printMalformedRows(malformed);
    printSummary({ dataRows, malformedCount: malformed.count, campaignCount: campaigns.size, elapsedSeconds, writtenPaths });
    return EXIT_OK;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return EXIT_FAILURE;
  }
}

function printMalformedRows({ count, samples }) {
  if (count === 0) {
    return;
  }
  console.error(`Warning: skipped ${count.toLocaleString('en-US')} malformed row(s). First ${samples.length}:`);
  for (const { lineNumber, problem, text } of samples) {
    const shown = text.length > SAMPLE_TEXT_LIMIT ? `${text.slice(0, SAMPLE_TEXT_LIMIT)}...` : text;
    console.error(`  line ${lineNumber}: ${problem}: ${shown}`);
  }
}

function printSummary({ dataRows, malformedCount, campaignCount, elapsedSeconds, writtenPaths }) {
  const peakRssMb = process.resourceUsage().maxRSS / 1024;
  const format = (value) => value.toLocaleString('en-US');
  console.log(`Rows read:         ${format(dataRows)}`);
  console.log(`Rows skipped:      ${format(malformedCount)}`);
  console.log(`Campaigns:         ${format(campaignCount)}`);
  console.log(`Processing time:   ${elapsedSeconds.toFixed(2)} s`);
  console.log(`Peak memory (RSS): ${peakRssMb.toFixed(1)} MB`);
  for (const writtenPath of writtenPaths) {
    console.log(`Wrote ${writtenPath}`);
  }
}

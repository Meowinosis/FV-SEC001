# Ad Performance Aggregator

A Node.js command line tool that streams a large advertising CSV (~1 GB) in one pass, totals each campaign's metrics, and writes two reports:

- `top10_ctr.csv`: the 10 campaigns with the highest click-through rate
- `top10_cpa.csv`: the 10 campaigns with the lowest cost per acquisition (campaigns with zero conversions are excluded)

It has no dependencies. The challenge's 1.04 GB `ad_data.csv` (26.8 million rows) takes about **5.5 seconds** with a peak memory of about **106 MB** (see [Performance](#performance)).

## Setup

You need **Node.js 20 or newer**. Nothing has to be installed: the tool uses only Node's standard library.

```bash
git clone <this-repo>
cd FV-SEC001
unzip ad_data.csv.zip        # produces ad_data.csv
```

## How to run

```bash
node aggregator.js --input ad_data.csv --output results/
```

| Option | Description |
|--------|-------------|
| `-i, --input <file>` | CSV file to process (required) |
| `-o, --output <dir>` | Directory for the result files (default `results`, created if missing) |
| `-h, --help` | Show usage |

Example output:

```text
Rows read:         26,843,544
Rows skipped:      0
Campaigns:         50
Processing time:   5.45 s
Peak memory (RSS): 106.7 MB
Wrote results/top10_ctr.csv
Wrote results/top10_cpa.csv
```

Exit codes: `0` success, `1` processing error (missing file, bad header and so on), `2` invalid command line.

### With Docker

```bash
docker build -t ad-aggregator .
docker run --rm -v "$PWD:/data" ad-aggregator --input /data/ad_data.csv --output /data/results
```

### Tests

```bash
npm test
```

The tests use the built-in `node:test` runner. They cover line splitting across chunk boundaries, CSV field parsing including quotes, number and date validation, exact rounding, ranking and tie-breaking, malformed rows, and an end-to-end run of the CLI that compares its output byte for byte with [expected files](test/fixtures/expected/).

## Output format

Both files have the same columns:

```text
campaign_id,total_impressions,total_clicks,total_spend,total_conversions,CTR,CPA
```

- `CTR = total_clicks / total_impressions`, with 4 decimal places
- `CPA = total_spend / total_conversions`, with 2 decimal places
- `total_spend` has 2 decimal places
- Rounding is half up and exact (see [Exact arithmetic](#exact-arithmetic))
- When a campaign has zero conversions, its CPA has no value and the cell is left empty (CSV's form of `null`). A CTR with zero impressions is handled the same way.

## Libraries used

None. Only Node.js built-in modules are used: `node:fs` (streaming reads), `node:util` (`parseArgs`), `node:perf_hooks` (timing) and `node:test` (tests).

## Performance

Measured on an Intel Core i7-14700K with 32 GB RAM, Windows 10 and Node 26.13.0.

| Input | Rows | Size | Processing time (3 runs) | Peak memory (RSS) | Log |
|-------|------|------|--------------------------|-------------------|-----|
| Challenge `ad_data.csv` | 26,843,544 | 1,043 MB | 5.45 to 5.58 s (about 190 MB/s) | 106 to 107 MB | [real-1gb.log](benchmarks/real-1gb.log) |
| Synthetic, from `scripts/generate-data.js` | 26,000,000 | 934 MB | 5.08 to 5.13 s | 105 to 107 MB | [synthetic-1gb.log](benchmarks/synthetic-1gb.log) |

On the real file, every row parsed and none were skipped. The two result files are byte-identical to those of an independent Python implementation that uses `csv` and `Decimal`. That check matters here: in this dataset every campaign in the CTR top 10 shows a CTR of `0.0275` at 4 decimal places, so their order depends entirely on comparing the exact fractions.

Peak memory is the process's maximum resident set size (`process.resourceUsage().maxRSS`). About 60 MB of it is the Node runtime itself: a 10-row file peaks at 62 MB. Memory does not grow with file size, only with the number of distinct campaigns.

To reproduce without the real file:

```bash
node scripts/generate-data.js --rows 26000000 --campaigns 50 --output ad_data.csv
node aggregator.js --input ad_data.csv --output results
```

## Design decisions

### One streaming pass, memory bounded by campaigns
The file is read in 1 MiB chunks with `fs.createReadStream`. Each line is parsed and added to a `Map` of per-campaign running totals, and then dropped. Only the totals stay in memory, so a 10 GB file needs the same memory as a 1 GB file.

### Parsing raw bytes instead of strings
Splitting every line into JavaScript strings would allocate several strings for each of 26 million rows. Instead, the parser works on byte offsets inside the chunk buffer ([src/line-splitter.js](src/line-splitter.js), [src/fields.js](src/fields.js)) and reads numbers directly from the bytes ([src/values.js](src/values.js)). The only string created per row is the `campaign_id`, which is needed as the map key. This is the main reason the tool runs at about 180 MB/s on a single thread.

### Exact arithmetic
Adding 26 million values like `45.50` as floating point numbers builds up rounding error, and the challenge asks for values that match precisely. So:

- **Spend** is parsed into whole micro-dollars (`45.50` becomes `45500000`) and summed as integers. Before the running sum can pass 2^53, it is moved into a `BigInt`, so totals of any size stay exact.
- **CTR and CPA** are never stored as floats. Rankings compare fractions by cross-multiplying in `BigInt` (`a/b < c/d` exactly when `a*d < c*b`), and printed values are rounded half up from the exact fraction ([src/ratio.js](src/ratio.js)). For example, `1.005` prints as `1.01`, whereas `(1.005).toFixed(2)` gives `1.00`.
- **Counts** stay plain Numbers for speed. A check at the end throws an error if any total passed `Number.MAX_SAFE_INTEGER`.

### Deterministic ranking
Ties on CTR or CPA are broken by `campaign_id` in ascending order, so every run produces the same file. The top 10 is found with a small sorted buffer instead of sorting every campaign ([`selectTop`](src/ranking.js)).

### Single-threaded
At about 5 seconds per gigabyte, splitting the file across `worker_threads` would save a few seconds at the cost of more complex code (finding line boundaries, merging partial results). That trade did not seem worth it here.

## Error handling

| Situation | Behavior |
|-----------|----------|
| Input file missing or a directory | Clear error message, exit code 1 |
| Empty file or no header | Error, exit code 1 |
| Header lacks a required column | Error listing the missing columns, exit code 1 |
| Columns in a different order, extra columns, UTF-8 BOM, quoted header names | Accepted |
| CRLF line endings, blank lines, trailing whitespace around fields | Accepted |
| Quoted fields (`"CMP, ""A"""`) | Accepted (RFC 4180), except for line breaks inside quotes |
| Malformed row: wrong field count, non-numeric or negative values, decimal counts, invalid calendar date, empty `campaign_id`, broken quotes | Row skipped and counted. The first 5 are printed with their line number and reason |
| Zero impressions or zero conversions | CTR or CPA left empty; the campaign is left out of that ranking |
| `clicks > impressions` | Accepted as is. The data is reported, not corrected |

## Project layout

```text
aggregator.js            Entry point
src/
  cli.js                 Argument parsing, orchestration, summary output
  aggregate.js           Header mapping, row validation, per-campaign totals
  line-splitter.js       Splits a byte stream into lines without copying
  fields.js              Splits a line into CSV fields (RFC 4180 quotes)
  values.js              Byte-level parsers for counts, spend and dates
  ratio.js               Exact BigInt comparison and rounding of ratios
  ranking.js             Summaries, top-N by CTR and CPA
  report.js              CSV output
test/                    node:test suites and fixtures
scripts/generate-data.js Synthetic data generator for benchmarks
benchmarks/              Benchmark logs
results/                 top10_ctr.csv and top10_cpa.csv
```

## AI assistance

This project was built with Claude Code. The prompts are recorded unedited in [PROMPTS.md](PROMPTS.md).

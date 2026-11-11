import { compareRatios } from './ratio.js';

/**
 * Turns the running totals into plain summary records.
 * Throws if a count grew past the range where a Number holds integers exactly.
 */
export function summarize(campaigns) {
  const summaries = [];
  for (const [campaignId, totals] of campaigns) {
    const { impressions, clicks, conversions } = totals;
    if (![impressions, clicks, conversions].every(Number.isSafeInteger)) {
      throw new RangeError(`Totals for campaign ${campaignId} are too large to sum exactly`);
    }
    summaries.push({ campaignId, impressions, clicks, spendMicros: totals.spendMicros, conversions });
  }
  return summaries;
}

/** Highest CTR first. Campaigns with no impressions have no CTR and are left out. */
export function topByCtr(summaries, limit) {
  const withCtr = summaries.filter((summary) => summary.impressions > 0);
  return selectTop(withCtr, limit, (a, b) =>
    compareRatios(b.clicks, b.impressions, a.clicks, a.impressions) || compareIds(a, b),
  );
}

/** Lowest CPA first. Campaigns with no conversions have no CPA and are left out. */
export function topByCpa(summaries, limit) {
  const withCpa = summaries.filter((summary) => summary.conversions > 0);
  return selectTop(withCpa, limit, (a, b) =>
    compareRatios(a.spendMicros, a.conversions, b.spendMicros, b.conversions) || compareIds(a, b),
  );
}

/**
 * Returns the first `limit` items in `compare` order without sorting the whole list.
 * It keeps a small sorted buffer, which costs O(n log limit) comparisons.
 */
export function selectTop(items, limit, compare) {
  if (limit <= 0) {
    return [];
  }
  const top = [];
  for (const item of items) {
    if (top.length === limit && compare(item, top[top.length - 1]) >= 0) {
      continue;
    }
    let low = 0;
    let high = top.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compare(item, top[middle]) < 0) {
        high = middle;
      } else {
        low = middle + 1;
      }
    }
    top.splice(low, 0, item);
    if (top.length > limit) {
      top.pop();
    }
  }
  return top;
}

/** Ties are broken by campaign_id so the output is the same on every run. */
function compareIds(a, b) {
  if (a.campaignId === b.campaignId) {
    return 0;
  }
  return a.campaignId < b.campaignId ? -1 : 1;
}

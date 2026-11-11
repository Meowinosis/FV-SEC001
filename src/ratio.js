/**
 * Exact arithmetic on ratios of non-negative integers. CTR and CPA are compared and
 * rounded with BigInt cross-multiplication, so floating-point error cannot change the
 * ranking or the last printed digit.
 */

/** Returns a negative number, zero or a positive number as a/b is less than, equal to or greater than c/d. */
export function compareRatios(a, b, c, d) {
  const left = BigInt(a) * BigInt(d);
  const right = BigInt(c) * BigInt(b);
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

/** Formats numerator/denominator with `digits` decimal places, rounding half up. */
export function formatRatio(numerator, denominator, digits) {
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  const scale = 10n ** BigInt(digits);
  const scaled = (2n * n * scale + d) / (2n * d);
  const whole = scaled / scale;
  if (digits === 0) {
    return whole.toString();
  }
  const fraction = (scaled % scale).toString().padStart(digits, '0');
  return `${whole}.${fraction}`;
}

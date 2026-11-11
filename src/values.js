const DIGIT_0 = 0x30;
const DOT = 0x2e;
const DASH = 0x2d;

/** Spend is held as whole micro-dollars (1 USD = 1,000,000) so that sums stay exact. */
export const MICROS_PER_UNIT = 1_000_000;
const SPEND_DECIMALS = 6;

/** At most 15 digits keeps any single count below Number.MAX_SAFE_INTEGER. */
const MAX_COUNT_DIGITS = 15;

/** At most 9 whole digits keeps a single spend below 10^15 micro-dollars. */
const MAX_SPEND_WHOLE_DIGITS = 9;

/** Value returned by the parsers below for anything that is not a valid value. */
export const INVALID = -1;

/** Parses a non-negative integer written as plain digits, such as `12000`. */
export function parseCount(buffer, start, end) {
  const length = end - start;
  if (length === 0 || length > MAX_COUNT_DIGITS) {
    return INVALID;
  }
  let value = 0;
  for (let i = start; i < end; i += 1) {
    const digit = buffer[i] - DIGIT_0;
    if (digit < 0 || digit > 9) {
      return INVALID;
    }
    value = value * 10 + digit;
  }
  return value;
}

/**
 * Parses a non-negative decimal such as `45.50` into micro-dollars (45500000).
 * Digits beyond the sixth decimal place are rounded half up.
 */
export function parseSpend(buffer, start, end) {
  let position = start;
  let whole = 0;
  let wholeDigits = 0;

  for (; position < end && buffer[position] !== DOT; position += 1) {
    const digit = buffer[position] - DIGIT_0;
    if (digit < 0 || digit > 9 || wholeDigits === MAX_SPEND_WHOLE_DIGITS) {
      return INVALID;
    }
    whole = whole * 10 + digit;
    wholeDigits += 1;
  }

  let fraction = 0;
  let fractionDigits = 0;
  let roundUp = false;

  for (position += 1; position < end; position += 1) {
    const digit = buffer[position] - DIGIT_0;
    if (digit < 0 || digit > 9) {
      return INVALID;
    }
    if (fractionDigits < SPEND_DECIMALS) {
      fraction = fraction * 10 + digit;
    } else if (fractionDigits === SPEND_DECIMALS) {
      roundUp = digit >= 5;
    }
    fractionDigits += 1;
  }

  if (wholeDigits === 0 && fractionDigits === 0) {
    return INVALID;
  }
  for (let i = fractionDigits; i < SPEND_DECIMALS; i += 1) {
    fraction *= 10;
  }
  return whole * MICROS_PER_UNIT + fraction + (roundUp ? 1 : 0);
}

/** Checks for a real calendar date written as `YYYY-MM-DD`. */
export function isValidDate(buffer, start, end) {
  if (end - start !== 10 || buffer[start + 4] !== DASH || buffer[start + 7] !== DASH) {
    return false;
  }
  const year = parseCount(buffer, start, start + 4);
  const month = parseCount(buffer, start + 5, start + 7);
  const day = parseCount(buffer, start + 8, start + 10);
  if (year === INVALID || month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

function daysInMonth(year, month) {
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeapYear ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

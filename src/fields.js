const COMMA = 0x2c;
const QUOTE = 0x22;
const SPACE = 0x20;
const TAB = 0x09;

/** Returned by `splitFields` when a quoted field is not closed properly. */
export const BROKEN_QUOTES = -1;

/**
 * Splits the line `buffer[start, end)` on commas and writes the byte range of field `k`
 * to `bounds[2k]` (start) and `bounds[2k + 1]` (end). Whitespace around fields is trimmed.
 *
 * Quoted fields follow RFC 4180: the range excludes the surrounding quotes, and commas
 * inside quotes do not split. Quoted fields cannot span lines.
 *
 * Returns the number of fields, `maxFields + 1` if the line has more than `maxFields`,
 * or `BROKEN_QUOTES`.
 */
export function splitFields(buffer, start, end, bounds, maxFields) {
  let count = 0;
  let position = start;

  for (;;) {
    if (count === maxFields) {
      return maxFields + 1;
    }

    let fieldStart = skipBlanks(buffer, position, end);
    let fieldEnd;

    if (fieldStart < end && buffer[fieldStart] === QUOTE) {
      const closingQuote = findClosingQuote(buffer, fieldStart + 1, end);
      if (closingQuote === -1) {
        return BROKEN_QUOTES;
      }
      fieldStart += 1;
      fieldEnd = closingQuote;
      position = skipBlanks(buffer, closingQuote + 1, end);
      if (position < end && buffer[position] !== COMMA) {
        return BROKEN_QUOTES;
      }
    } else {
      position = fieldStart;
      while (position < end && buffer[position] !== COMMA) {
        position += 1;
      }
      fieldEnd = trimTrailingBlanks(buffer, fieldStart, position);
    }

    bounds[2 * count] = fieldStart;
    bounds[2 * count + 1] = fieldEnd;
    count += 1;

    if (position >= end) {
      return count;
    }
    position += 1;
  }
}

/** Decodes a field as text, turning RFC 4180 escaped quotes (`""`) back into `"`. */
export function decodeField(buffer, start, end) {
  const text = buffer.toString('utf8', start, end);
  return text.includes('"') ? text.replaceAll('""', '"') : text;
}

function isBlank(byte) {
  return byte === SPACE || byte === TAB;
}

function skipBlanks(buffer, position, end) {
  while (position < end && isBlank(buffer[position])) {
    position += 1;
  }
  return position;
}

function trimTrailingBlanks(buffer, start, end) {
  while (end > start && isBlank(buffer[end - 1])) {
    end -= 1;
  }
  return end;
}

function findClosingQuote(buffer, position, end) {
  for (; position < end; position += 1) {
    if (buffer[position] !== QUOTE) {
      continue;
    }
    if (position + 1 < end && buffer[position + 1] === QUOTE) {
      position += 1;
      continue;
    }
    return position;
  }
  return -1;
}

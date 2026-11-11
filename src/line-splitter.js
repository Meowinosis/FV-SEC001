const LF = 0x0a;
const CR = 0x0d;

/**
 * Reads `source` (an async iterable of Buffers) and calls `onLine(buffer, start, end)`
 * once per line, with the LF or CRLF terminator removed.
 *
 * Lines are handed over as byte ranges into the chunk buffer, so no string or buffer
 * is allocated per line. Only a line that straddles two chunks is copied.
 */
export async function forEachLine(source, onLine) {
  const emit = (buffer, start, end) => {
    const lineEnd = end > start && buffer[end - 1] === CR ? end - 1 : end;
    onLine(buffer, start, lineEnd);
  };

  let carry = null;

  for await (const chunk of source) {
    let start = 0;
    let newline = chunk.indexOf(LF);

    if (carry !== null) {
      if (newline === -1) {
        carry = Buffer.concat([carry, chunk]);
        continue;
      }
      const joined = Buffer.concat([carry, chunk.subarray(0, newline)]);
      emit(joined, 0, joined.length);
      carry = null;
      start = newline + 1;
      newline = chunk.indexOf(LF, start);
    }

    while (newline !== -1) {
      emit(chunk, start, newline);
      start = newline + 1;
      newline = chunk.indexOf(LF, start);
    }

    if (start < chunk.length) {
      carry = Buffer.from(chunk.subarray(start));
    }
  }

  if (carry !== null) {
    emit(carry, 0, carry.length);
  }
}

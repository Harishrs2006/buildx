// Minimal streaming RFC 4180 CSV reader (quoted fields, "" escapes, embedded commas/newlines,
// CRLF or LF, leading UTF-8 BOM). Enough for the India Post directory; no dependency needed.

export async function* parseCsv(chunks: AsyncIterable<string | Buffer>): AsyncGenerator<string[]> {
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let pendingQuote = false; // saw a quote inside a quoted field; next char decides escape vs close
  let first = true;

  for await (const chunk of chunks) {
    let text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    if (first) {
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      first = false;
    }
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (pendingQuote) {
          pendingQuote = false;
          if (c === '"') { field += '"'; continue; }
          inQuotes = false; // closing quote; fall through to handle c normally
        } else if (c === '"') {
          pendingQuote = true;
          continue;
        } else {
          field += c;
          continue;
        }
      }
      if (c === '"' && field === '') { inQuotes = true; continue; }
      if (c === ',') { row.push(field); field = ''; continue; }
      if (c === '\r') continue;
      if (c === '\n') {
        row.push(field);
        field = '';
        if (!(row.length === 1 && row[0] === '')) yield row; // skip blank lines
        row = [];
        continue;
      }
      field += c;
    }
  }
  if (pendingQuote) inQuotes = false;
  if (inQuotes) throw new Error('CSV ends inside a quoted field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    yield row;
  }
}

import { createReadStream } from "node:fs";

/** RFC 4180 parser over string chunks: quoted fields, escaped quotes, CRLF, and newlines inside quotes. */
export async function* parseCsvRows(chunks: AsyncIterable<string> | Iterable<string>): AsyncGenerator<string[]> {
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let pendingQuote = false;
  let first = true;

  for await (let chunk of chunks) {
    if (first) {
      chunk = chunk.replace(/^﻿/, "");
      first = false;
    }
    for (let i = 0; i < chunk.length; i += 1) {
      const char = chunk[i]!;
      if (inQuotes) {
        if (pendingQuote) {
          pendingQuote = false;
          if (char === '"') {
            field += '"';
            continue;
          }
          inQuotes = false;
        } else if (char === '"') {
          pendingQuote = true;
          continue;
        } else {
          field += char;
          continue;
        }
      }
      if (char === '"' && field === "") {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
        yield row;
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  if (pendingQuote) {
    inQuotes = false;
  }
  if (field !== "" || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    yield row;
  }
}

/** Yields one object per data row, keyed by header name (headers are upper-cased and trimmed). */
export async function* readCsvRecords(
  source: string | AsyncIterable<string> | Iterable<string>,
): AsyncGenerator<{ line: number; record: Record<string, string> }> {
  const chunks =
    typeof source === "string" ? createReadStream(source, { encoding: "utf8", highWaterMark: 1 << 20 }) : source;
  let headers: string[] | null = null;
  let line = 0;
  for await (const row of parseCsvRows(chunks as AsyncIterable<string>)) {
    line += 1;
    if (!headers) {
      headers = row.map((header) => header.trim().toUpperCase());
      continue;
    }
    if (row.length === 1 && row[0] === "") {
      continue;
    }
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    yield { line, record };
  }
}

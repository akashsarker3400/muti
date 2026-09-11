/**
 * CSV helpers for the student importer (section 7.5). They live outside the
 * "use server" module so they can be unit tested directly.
 */

/** Minimal RFC 4180 parser: handles quoted cells, escaped quotes and CRLF. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which Excel adds when saving as CSV.
  const text = input.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

/** Accepts YYYY-MM-DD and DD/MM/YYYY, which is what office sheets contain. */
export function parseImportDate(value: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) {
    return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    return new Date(`${dmy[3]}-${month}-${day}T00:00:00.000Z`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

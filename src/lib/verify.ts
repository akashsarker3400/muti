/**
 * Shared helpers for the public lookups (addendum 3, §1–2). Pure functions so
 * the unit tests can pin the normalisation rules.
 */

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/** "০১৭৭৮" -> "01778". Applies to every numeric field on import and search. */
export function latinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
}

/**
 * BMDC registration numbers are written many ways — "A-12345", "A 12345",
 * "a12345", "12-345". Strip the spaces, dashes and the leading "A-" so the
 * same doctor always matches.
 */
export function normalizeBmdc(input: string): string {
  return latinDigits(input)
    .trim()
    .toUpperCase()
    .replace(/^A[\s-]*/, "")
    .replace(/[\s-]/g, "");
}

/** Certificate numbers compare case-insensitively with spaces collapsed. */
export function normalizeCertificateNo(input: string): string {
  return latinDigits(input).trim().replace(/\s+/g, "").toUpperCase();
}

/** Board rolls and registration numbers are digits only. */
export function normalizeRoll(input: string): string {
  return latinDigits(input).replace(/\D/g, "");
}

/**
 * Site Settings → "01101 = Basic Physics" per line -> { "01101": "Basic Physics" }.
 * Tolerates ":" and tabs as separators and ignores blank or malformed lines.
 */
export function parseSubjectCodes(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([0-9A-Za-z]+)\s*[=:\t]\s*(.+?)\s*$/);
    if (match) map[match[1]!] = match[2]!;
  }
  return map;
}

/**
 * "01101[T], 01103[T,P]" -> [{ code: "01101", parts: ["T"] }, …]. The board
 * writes T for theory and P for practical.
 */
export function parseFailedSubjects(
  text: string | null | undefined,
): Array<{ code: string; parts: string[] }> {
  if (!text) return [];
  const items: Array<{ code: string; parts: string[] }> = [];
  const pattern = /([0-9A-Za-z]+)\s*(?:\[([^\]]*)\])?/g;
  for (const match of text.matchAll(pattern)) {
    const code = match[1]!;
    if (!code) continue;
    const parts = (match[2] ?? "")
      .split(/[,\s]+/)
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean);
    items.push({ code, parts });
  }
  return items;
}

export type ParsedBoardRow = {
  roll: string;
  status: "PASS" | "FAIL";
  gpa?: string;
  failedSubjects?: string;
};

/**
 * Pulls result rows out of a pasted BTEB notice: "3825000128 (4.00)" is a
 * pass, "3825000129 {01101[T], 01103[T]}" a fail (addendum 3, §2).
 */
export function parseBoardNotice(text: string): ParsedBoardRow[] {
  const source = latinDigits(text);
  const rows = new Map<string, ParsedBoardRow>();
  for (const match of source.matchAll(/(\d{10})\s*\(\s*([\d.]+)\s*\)/g)) {
    rows.set(match[1]!, { roll: match[1]!, status: "PASS", gpa: match[2] });
  }
  for (const match of source.matchAll(/(\d{10})\s*\{([^}]*)\}/g)) {
    rows.set(match[1]!, {
      roll: match[1]!,
      status: "FAIL",
      failedSubjects: match[2]!.replace(/\s+/g, " ").trim(),
    });
  }
  return [...rows.values()];
}

/**
 * Site Settings → "ADVISOR = উপদেষ্টা | Advisors" per line.
 * Returns the categories in the order written, which is the display order.
 */
export function parseAdvisorCategories(
  text: string,
): Array<{ key: string; labelBn: string; labelEn: string }> {
  const list: Array<{ key: string; labelBn: string; labelEn: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(
      /^\s*([A-Za-z0-9_-]+)\s*=\s*([^|]+?)\s*(?:\|\s*(.+?))?\s*$/,
    );
    if (!match) continue;
    const labelBn = match[2]!;
    list.push({ key: match[1]!.toUpperCase(), labelBn, labelEn: match[3] ?? labelBn });
  }
  return list;
}

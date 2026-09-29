/**
 * Certificate number series (docs/id-card-certificate-proposal.md, stage 3).
 *
 * The office writes the shape once in Site Settings and every certificate is
 * numbered from it, so a series never restarts by accident and two people
 * issuing at the same time cannot land on the same number. Pure functions: the
 * server action supplies the running number, the unit tests exercise the
 * placeholders.
 *
 * Placeholders, all optional:
 *   {prefix}    the prefix from Site Settings, e.g. MUTI
 *   {course}    the course code, e.g. CMU or DMU
 *   {type}      C for a course certificate, S for semester, B for board
 *   {year}      four-digit year of issue
 *   {yy}        two-digit year of issue
 *   {month}     two-digit month of issue
 *   {seq}       the running number, {seq:5} to pad to five digits
 */

export const DEFAULT_CERTIFICATE_FORMAT = "{prefix}-{course}-{year}-{seq:4}";

export type CertificateNumberParts = {
  prefix: string;
  courseCode: string;
  type: "COURSE" | "SEMESTER" | "BOARD";
  issuedAt: Date;
};

const TYPE_LETTER: Record<CertificateNumberParts["type"], string> = {
  COURSE: "C",
  SEMESTER: "S",
  BOARD: "B",
};

function replacements(parts: CertificateNumberParts): Record<string, string> {
  const year = parts.issuedAt.getUTCFullYear();
  return {
    prefix: parts.prefix.trim(),
    course: parts.courseCode.trim(),
    type: TYPE_LETTER[parts.type],
    year: String(year),
    yy: String(year).slice(-2),
    month: String(parts.issuedAt.getUTCMonth() + 1).padStart(2, "0"),
  };
}

/**
 * The part of the number that stays the same across one series: the format
 * with {seq} removed. Two certificates share a counter when, and only when,
 * they share this string.
 */
export function seriesKey(format: string, parts: CertificateNumberParts): string {
  return fill(format, parts)
    .replace(/\{seq(?::\d+)?\}/g, "")
    .replace(/[-/_]+$/g, "");
}

/** The finished number for a given running value. */
export function renderCertificateNumber(
  format: string,
  parts: CertificateNumberParts,
  sequence: number,
): string {
  return fill(format, parts).replace(/\{seq(?::(\d+))?\}/g, (_match, pad?: string) =>
    String(sequence).padStart(pad ? Number(pad) : 1, "0"),
  );
}

function fill(format: string, parts: CertificateNumberParts): string {
  const values = replacements(parts);
  return (format.trim() || DEFAULT_CERTIFICATE_FORMAT)
    .replace(/\{(prefix|course|type|year|yy|month)\}/g, (_match, key: string) => values[key] ?? "")
    // A missing prefix or course must not leave a double separator behind.
    .replace(/([-/_])\1+/g, "$1")
    .replace(/^[-/_]+|[-/_]+$/g, "");
}

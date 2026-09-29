/**
 * Grades (addendum 2, B3).
 *
 * The scale is the one BTEB uses, because these students sit BTEB
 * examinations and a different scale on the institute's own mark sheet would
 * only confuse them. The office can override it in Site Settings.
 */

export type GradeBand = { from: number; grade: string; point: number };

/** BTEB's scale, as percentages of the full marks. */
export const DEFAULT_SCALE: GradeBand[] = [
  { from: 80, grade: "A+", point: 4.0 },
  { from: 75, grade: "A", point: 3.75 },
  { from: 70, grade: "A-", point: 3.5 },
  { from: 65, grade: "B+", point: 3.25 },
  { from: 60, grade: "B", point: 3.0 },
  { from: 55, grade: "B-", point: 2.75 },
  { from: 50, grade: "C+", point: 2.5 },
  { from: 45, grade: "C", point: 2.25 },
  { from: 40, grade: "D", point: 2.0 },
  { from: 0, grade: "F", point: 0 },
];

/**
 * Reads a scale typed as "80=A+=4.00" lines. A line that cannot be read is
 * skipped rather than throwing: a typo in a settings box must not take the
 * marks page down with it.
 */
export function parseScale(text: string | null | undefined): GradeBand[] {
  if (!text?.trim()) return DEFAULT_SCALE;

  const bands: GradeBand[] = [];
  for (const line of text.split("\n")) {
    const [from, grade, point] = line.split("=").map((part) => part.trim());
    const fromValue = Number(from);
    if (!grade || !Number.isFinite(fromValue)) continue;
    bands.push({ from: fromValue, grade, point: Number(point) || 0 });
  }

  if (bands.length === 0) return DEFAULT_SCALE;
  return bands.sort((a, b) => b.from - a.from);
}

/** The band a mark falls in. Null marks mean the student did not sit. */
export function gradeFor(
  marks: number | null | undefined,
  fullMarks: number,
  scale: GradeBand[] = DEFAULT_SCALE,
): { grade: string; point: number } | null {
  if (marks === null || marks === undefined || fullMarks <= 0) return null;

  const percent = (marks / fullMarks) * 100;
  for (const band of scale) {
    if (percent >= band.from) return { grade: band.grade, point: band.point };
  }
  return { grade: "F", point: 0 };
}

/** Whether a mark passes, by the examination's own pass mark. */
export function passed(
  marks: number | null | undefined,
  passMarks: number,
): boolean | null {
  if (marks === null || marks === undefined) return null;
  return marks >= passMarks;
}

import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Attendance percentage (addendum 2, B1).
 *
 * Present and late both count as attended — a student who walked in ten
 * minutes after the start was still taught. Excused absences are left out of
 * the total rather than counted against anybody, which is what "excused"
 * means. Only classes marked DONE count, so a register nobody took never
 * damages a student's record.
 */
export type AttendanceSummary = {
  held: number;
  attended: number;
  absent: number;
  excused: number;
  percent: number | null;
};

export async function attendanceFor(studentId: string): Promise<AttendanceSummary> {
  const rows = await prisma.attendance.findMany({
    where: { studentId, session: { status: "DONE" } },
    select: { status: true },
  });

  const attended = rows.filter(
    (row) => row.status === "PRESENT" || row.status === "LATE",
  ).length;
  const excused = rows.filter((row) => row.status === "EXCUSED").length;
  const absent = rows.filter((row) => row.status === "ABSENT").length;
  const counted = attended + absent;

  return {
    held: rows.length,
    attended,
    absent,
    excused,
    percent: counted === 0 ? null : Math.round((attended / counted) * 100),
  };
}

/** The same figures for a whole batch, in one query per batch. */
export async function attendanceForBatch(
  batchId: string,
): Promise<Map<string, AttendanceSummary>> {
  const rows = await prisma.attendance.findMany({
    where: { session: { batchId, status: "DONE" } },
    select: { studentId: true, status: true },
  });

  const byStudent = new Map<string, { attended: number; absent: number; excused: number }>();
  for (const row of rows) {
    const entry = byStudent.get(row.studentId) ?? { attended: 0, absent: 0, excused: 0 };
    if (row.status === "PRESENT" || row.status === "LATE") entry.attended += 1;
    else if (row.status === "EXCUSED") entry.excused += 1;
    else entry.absent += 1;
    byStudent.set(row.studentId, entry);
  }

  const summary = new Map<string, AttendanceSummary>();
  for (const [studentId, entry] of byStudent) {
    const counted = entry.attended + entry.absent;
    summary.set(studentId, {
      held: entry.attended + entry.absent + entry.excused,
      attended: entry.attended,
      absent: entry.absent,
      excused: entry.excused,
      percent: counted === 0 ? null : Math.round((entry.attended / counted) * 100),
    });
  }
  return summary;
}

import "server-only";

import { logActivity } from "@/lib/admin-auth";
import { includingDeleted, prisma } from "@/lib/prisma";

/**
 * Student roll numbers (ERP addendum, 2.7): `MUTI-2026-CMU-001`.
 *
 * Prefix, admission year, course code, then a running number that restarts
 * each year for each course. The number comes from the same atomic `Counter`
 * table the certificate series uses, so two people admitting at once cannot be
 * handed the same roll, and a roll the office typed by hand is skipped rather
 * than reused.
 */

export function renderRoll(
  prefix: string,
  year: number,
  courseCode: string,
  seq: number,
): string {
  return `${prefix}-${year}-${courseCode}-${String(seq).padStart(3, "0")}`;
}

export async function nextRoll(input: {
  courseId: string;
  prefix: string;
  at?: Date;
}): Promise<string | null> {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { code: true },
  });
  if (!course) return null;

  const year = (input.at ?? new Date()).getFullYear();
  const key = `roll:${input.prefix}:${year}:${course.code}`;

  // At most a few spins: only a hand-typed roll can collide.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    const roll = renderRoll(input.prefix, year, course.code, counter.value);
    // A deleted student still owns their roll: the column is unique across
    // every row, so the check has to see past the soft-delete filter.
    const taken = await prisma.student.findFirst({
      where: { roll, ...includingDeleted },
      select: { id: true },
    });
    if (!taken) return roll;
  }
  return null;
}

/** Audited, because a roll leaving the series is a fact worth accounting for. */
export async function allocateRoll(
  userId: string,
  input: { courseId: string; prefix: string; at?: Date },
): Promise<string | null> {
  const roll = await nextRoll(input);
  if (roll) await logActivity(userId, "roll-number", "student", roll);
  return roll;
}

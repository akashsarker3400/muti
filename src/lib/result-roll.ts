import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeRoll } from "@/lib/verify";

/**
 * Which student holds each result roll. The exams are MUTI's own, so a
 * result roll is the student's institute roll ("MUTI-2026-CMU-001",
 * compared case-insensitively). A student who still carries an older
 * all-digit board roll is found by that as well, so rows entered before the
 * change keep their link.
 *
 * Keys are normalised rolls (`normalizeRoll`), the form result rows are
 * stored in.
 */
export async function studentsByResultRoll(
  rolls: string[],
): Promise<Map<string, { id: string; name: string }>> {
  const unique = [...new Set(rolls.filter(Boolean))];
  const found = new Map<string, { id: string; name: string }>();
  if (unique.length === 0) return found;

  const students = await prisma.student.findMany({
    where: {
      OR: [
        ...unique.map((roll) => ({
          roll: { equals: roll, mode: "insensitive" as const },
        })),
        { boardRoll: { in: unique } },
      ],
    },
    select: { id: true, name: true, roll: true, boardRoll: true },
  });
  for (const student of students) {
    const entry = { id: student.id, name: student.name };
    if (student.boardRoll) found.set(student.boardRoll, entry);
    // The institute roll wins over a legacy board roll with the same key.
    found.set(normalizeRoll(student.roll), entry);
  }
  return found;
}

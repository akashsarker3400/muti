import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * What each teacher is owed for the classes they actually took
 * (addendum 2, B7).
 *
 * Only sessions marked DONE count, which means the register is what decides
 * the pay. That is the right incentive and the right record: a class nobody
 * registered did not visibly happen.
 */

export type TeacherDue = {
  facultyId: string;
  name: string;
  sessions: number;
  byType: Record<string, number>;
  amount: number;
  /** True when some of their classes have no rate set, so the total is short. */
  missingRate: boolean;
};

/** The rate in force for a teacher, class type and date. */
function rateFor(
  rates: Array<{ courseId: string | null; type: string; ratePerClass: number; effectiveFrom: Date }>,
  type: string,
  courseId: string | null,
  when: Date,
): number | null {
  const candidates = rates
    .filter((rate) => rate.type === type && rate.effectiveFrom <= when)
    .filter((rate) => rate.courseId === null || rate.courseId === courseId)
    // A rate for this course beats a general one; a newer rate beats an older.
    .sort((a, b) => {
      if ((b.courseId ? 1 : 0) !== (a.courseId ? 1 : 0)) {
        return (b.courseId ? 1 : 0) - (a.courseId ? 1 : 0);
      }
      return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
    });

  return candidates[0]?.ratePerClass ?? null;
}

export async function teacherDues(from: Date, to: Date): Promise<TeacherDue[]> {
  const faculty = await prisma.faculty.findMany({
    orderBy: { name: "asc" },
    include: {
      rates: true,
      sessions: {
        where: { status: "DONE", date: { gte: from, lte: to } },
        include: { batch: { select: { courseId: true } } },
      },
    },
  });

  return faculty
    .filter((teacher) => teacher.sessions.length > 0)
    .map((teacher) => {
      const byType: Record<string, number> = {};
      let amount = 0;
      let missingRate = false;

      for (const session of teacher.sessions) {
        byType[session.type] = (byType[session.type] ?? 0) + 1;
        const rate = rateFor(
          teacher.rates,
          session.type,
          session.batch.courseId,
          session.date,
        );
        if (rate === null) missingRate = true;
        else amount += rate;
      }

      return {
        facultyId: teacher.id,
        name: teacher.name,
        sessions: teacher.sessions.length,
        byType,
        amount,
        missingRate,
      };
    });
}

/** What has been paid out for a period, so a month is not paid twice. */
export async function paidInPeriod(from: Date, to: Date) {
  return prisma.teacherPayment.findMany({
    where: { periodFrom: { gte: from }, periodTo: { lte: to } },
    include: { faculty: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

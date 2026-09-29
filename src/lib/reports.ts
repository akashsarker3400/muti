import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The owner's numbers (addendum 2, B8).
 *
 * Every figure here answers a question somebody actually asks: did we collect
 * what we were owed, where do the enquiries come from, which of them turn
 * into students, and which batches are filling.
 */

export type MonthPoint = { month: string; value: number };

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** The last `months` months, oldest first, with zeroes where nothing happened. */
function emptyMonths(months: number): MonthPoint[] {
  const points: MonthPoint[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (months - 1));

  for (let index = 0; index < months; index += 1) {
    points.push({ month: monthKey(cursor), value: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

export type Reports = {
  collectedThisMonth: number;
  outstanding: number;
  overdue: number;
  /** Collected ÷ (collected + overdue) for this month, or null with nothing to divide. */
  collectionRate: number | null;
  admissions: MonthPoint[];
  collections: MonthPoint[];
  leads: Array<{ source: string; total: number; admitted: number }>;
  batches: Array<{
    id: string;
    name: string;
    seats: number | null;
    filled: number;
    students: number;
    attendance: number | null;
    due: number;
  }>;
  openAlerts: number;
};

export async function buildReports(months = 12): Promise<Reports> {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  since.setMonth(since.getMonth() - (months - 1));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [payments, students, applications, batches, overdueAgg, outstandingAgg, alerts] =
    await Promise.all([
      prisma.payment.findMany({
        where: { voidedAt: null, paidAt: { gte: since } },
        select: { amount: true, paidAt: true },
      }),
      prisma.student.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.application.findMany({
        where: { deletedAt: null, createdAt: { gte: since } },
        select: { source: true, status: true },
      }),
      prisma.batch.findMany({
        where: { deletedAt: null, status: { in: ["UPCOMING", "RUNNING"] } },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          name: true,
          seats: true,
          seatsFilled: true,
          _count: { select: { students: true } },
        },
      }),
      prisma.installment.aggregate({
        where: { status: "OVERDUE" },
        _sum: { amount: true, paidAmount: true },
      }),
      prisma.installment.aggregate({
        where: { status: { in: ["DUE", "PARTIAL", "OVERDUE"] } },
        _sum: { amount: true, paidAmount: true },
      }),
      prisma.alert.count({ where: { status: "OPEN" } }),
    ]);

  const collections = emptyMonths(months);
  const admissions = emptyMonths(months);
  const byMonth = new Map(collections.map((point, index) => [point.month, index]));

  let collectedThisMonth = 0;
  for (const payment of payments) {
    const index = byMonth.get(monthKey(payment.paidAt));
    if (index !== undefined) collections[index]!.value += payment.amount;
    if (payment.paidAt >= monthStart) collectedThisMonth += payment.amount;
  }
  for (const student of students) {
    const index = byMonth.get(monthKey(student.createdAt));
    if (index !== undefined) admissions[index]!.value += 1;
  }

  const leadMap = new Map<string, { total: number; admitted: number }>();
  for (const application of applications) {
    const key = application.source ?? "direct";
    const entry = leadMap.get(key) ?? { total: 0, admitted: 0 };
    entry.total += 1;
    if (application.status === "ADMITTED") entry.admitted += 1;
    leadMap.set(key, entry);
  }

  // Attendance and dues per batch, in two queries rather than one per batch.
  const batchIds = batches.map((batch) => batch.id);
  const [attendanceRows, dueRows] = await Promise.all([
    batchIds.length
      ? prisma.attendance.findMany({
          where: { session: { batchId: { in: batchIds }, status: "DONE" } },
          select: { status: true, session: { select: { batchId: true } } },
        })
      : [],
    batchIds.length
      ? prisma.installment.findMany({
          where: {
            status: { in: ["DUE", "PARTIAL", "OVERDUE"] },
            feePlan: { student: { batchId: { in: batchIds } } },
          },
          select: {
            amount: true,
            paidAmount: true,
            feePlan: { select: { student: { select: { batchId: true } } } },
          },
        })
      : [],
  ]);

  const attendanceByBatch = new Map<string, { attended: number; counted: number }>();
  for (const row of attendanceRows) {
    const key = row.session.batchId;
    const entry = attendanceByBatch.get(key) ?? { attended: 0, counted: 0 };
    if (row.status === "PRESENT" || row.status === "LATE") {
      entry.attended += 1;
      entry.counted += 1;
    } else if (row.status === "ABSENT") {
      entry.counted += 1;
    }
    attendanceByBatch.set(key, entry);
  }

  const dueByBatch = new Map<string, number>();
  for (const row of dueRows) {
    const key = row.feePlan.student.batchId;
    if (!key) continue;
    dueByBatch.set(key, (dueByBatch.get(key) ?? 0) + (row.amount - row.paidAmount));
  }

  const overdue = (overdueAgg._sum.amount ?? 0) - (overdueAgg._sum.paidAmount ?? 0);
  const outstanding =
    (outstandingAgg._sum.amount ?? 0) - (outstandingAgg._sum.paidAmount ?? 0);

  return {
    collectedThisMonth,
    outstanding,
    overdue,
    collectionRate:
      collectedThisMonth + overdue === 0
        ? null
        : Math.round((collectedThisMonth / (collectedThisMonth + overdue)) * 100),
    admissions,
    collections,
    leads: [...leadMap.entries()]
      .map(([source, entry]) => ({ source, ...entry }))
      .sort((a, b) => b.total - a.total),
    batches: batches.map((batch) => {
      const attendance = attendanceByBatch.get(batch.id);
      return {
        id: batch.id,
        name: batch.name,
        seats: batch.seats,
        filled: batch.seatsFilled,
        students: batch._count.students,
        attendance:
          attendance && attendance.counted > 0
            ? Math.round((attendance.attended / attendance.counted) * 100)
            : null,
        due: dueByBatch.get(batch.id) ?? 0,
      };
    }),
    openAlerts: alerts,
  };
}

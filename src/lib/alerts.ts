import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * The nightly sweep for students who need a phone call (addendum 2, B6).
 *
 * Two kinds, and both are deliberately conservative: an alert that fires for
 * everybody is an alert the office learns to ignore, and then the one that
 * mattered goes unread with the rest.
 */

/** No attendance in this many days counts as drifting away. */
const DROPOUT_DAYS = 14;
/** The batch must actually have met this often in the window, or it proves nothing. */
const MIN_SESSIONS = 2;
/** How far past its due date a fee goes before the office is told. */
const OVERDUE_DAYS = 15;

export type AlertSweep = { dropout: number; fees: number };

/**
 * A student is at risk when their batch has been meeting and they have not
 * been there. Without the second half, every student of a batch on holiday
 * would be flagged.
 */
async function sweepDropouts(): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - DROPOUT_DAYS);

  const batches = await prisma.batch.findMany({
    where: { status: "RUNNING", deletedAt: null },
    select: {
      id: true,
      name: true,
      students: {
        where: { status: "ACTIVE", deletedAt: null },
        select: { id: true, name: true },
      },
      sessions: {
        where: { status: "DONE", date: { gte: since } },
        select: { id: true },
      },
    },
  });

  let raised = 0;

  for (const batch of batches) {
    if (batch.sessions.length < MIN_SESSIONS) continue;
    const sessionIds = batch.sessions.map((session) => session.id);

    for (const student of batch.students) {
      const seen = await prisma.attendance.count({
        where: {
          studentId: student.id,
          sessionId: { in: sessionIds },
          status: { in: ["PRESENT", "LATE"] },
        },
      });
      if (seen > 0) continue;

      // One open alert per student per kind: a second one tomorrow would be
      // the same news twice.
      const already = await prisma.alert.findFirst({
        where: { studentId: student.id, type: "DROPOUT_RISK", status: "OPEN" },
        select: { id: true },
      });
      if (already) continue;

      await prisma.alert.create({
        data: {
          type: "DROPOUT_RISK",
          studentId: student.id,
          batchId: batch.id,
          message: `${student.name} has missed every one of the last ${batch.sessions.length} classes of ${batch.name}.`,
        },
      });
      raised += 1;
    }
  }

  return raised;
}

/** A fee more than a fortnight past its date is worth a phone call. */
async function sweepOverdueFees(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);

  const installments = await prisma.installment.findMany({
    where: { status: "OVERDUE", dueDate: { lt: cutoff } },
    include: {
      feePlan: { include: { student: { select: { id: true, name: true } } } },
    },
    take: 300,
  });

  let raised = 0;

  for (const installment of installments) {
    const student = installment.feePlan.student;
    const already = await prisma.alert.findFirst({
      where: { studentId: student.id, type: "OVERDUE_FEES", status: "OPEN" },
      select: { id: true },
    });
    if (already) continue;

    const owed = installment.amount - installment.paidAmount;
    await prisma.alert.create({
      data: {
        type: "OVERDUE_FEES",
        studentId: student.id,
        message: `${student.name} owes ${owed} Taka on "${installment.label}", more than ${OVERDUE_DAYS} days past its date.`,
      },
    });
    raised += 1;
  }

  return raised;
}

export async function sweepAlerts(): Promise<AlertSweep> {
  return { dropout: await sweepDropouts(), fees: await sweepOverdueFees() };
}

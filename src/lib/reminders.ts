import "server-only";

import { markOverdue } from "@/lib/fees";
import { sendTemplate } from "@/lib/messaging";
import { formatDate, toBanglaDigits } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * The automatic reminders (addendum 2, A4).
 *
 * Two of them, and deliberately only two: a class that is about to start, and
 * a health serial for tomorrow. Fees, attendance and exams belong to phase 2
 * and have no data here yet, so there is nothing honest to remind anybody
 * about.
 *
 * Run from `/api/cron/messages`. Every send carries a dedupe key, so running
 * the job twice an hour, or twice at once, sends nothing twice.
 */

export type ReminderSummary = {
  classStarting: { sent: number; skipped: number };
  appointments: { sent: number; skipped: number };
  fees: { markedOverdue: number; sent: number; skipped: number };
};

/** Midnight-to-midnight window, `days` from today, in the office's own day. */
function dayWindow(days: number): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + days);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Three days before a batch starts, tell the students it is starting. */
async function remindClassStarting(institute: string): Promise<{
  sent: number;
  skipped: number;
}> {
  const { start, end } = dayWindow(3);
  let sent = 0;
  let skipped = 0;

  const batches = await prisma.batch.findMany({
    where: { startDate: { gte: start, lt: end }, status: { not: "COMPLETED" } },
    select: {
      id: true,
      name: true,
      startDate: true,
      course: { select: { nameEn: true, fullNameEn: true } },
      students: {
        // Spelt out: a nested read is not covered by the soft-delete extension.
        where: { status: "ACTIVE", deletedAt: null },
        select: { id: true, name: true, phone: true },
      },
    },
  });

  for (const batch of batches) {
    for (const student of batch.students) {
      if (!student.phone) {
        skipped += 1;
        continue;
      }
      const result = await sendTemplate({
        key: "class-starting",
        to: student.phone,
        values: {
          name: student.name,
          course: batch.course.nameEn || batch.course.fullNameEn,
          batch: batch.name,
          date: batch.startDate ? formatDate(batch.startDate, "bn") : "",
          institute,
        },
        entity: "student",
        entityId: student.id,
        dedupeKey: `class-starting:${batch.id}:${student.id}`,
      });
      if (result.sent) sent += 1;
      else skipped += 1;
    }
  }

  return { sent, skipped };
}

/**
 * The day before a confirmed health serial, send the serial number and date.
 * Never the complaint: the message is health data on somebody's lock screen
 * (addendum 4, §5).
 */
async function remindAppointments(institute: string): Promise<{
  sent: number;
  skipped: number;
}> {
  const { start, end } = dayWindow(1);
  let sent = 0;
  let skipped = 0;

  const appointments = await prisma.healthAppointment.findMany({
    where: {
      status: "CONFIRMED",
      preferredDate: { gte: start, lt: end },
      anonymizedAt: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      serialNo: true,
      preferredDate: true,
    },
  });

  for (const appointment of appointments) {
    const result = await sendTemplate({
      key: "appointment-reminder",
      to: appointment.phone,
      values: {
        name: appointment.name,
        // The date beside it is in Bangla digits; a Latin serial next to it
        // reads as a different kind of number.
        serial: toBanglaDigits(appointment.serialNo),
        date: appointment.preferredDate
          ? formatDate(appointment.preferredDate, "bn")
          : "",
        institute,
      },
      entity: "appointment",
      entityId: appointment.id,
      dedupeKey: `appointment-reminder:${appointment.id}`,
    });
    if (result.sent) sent += 1;
    else skipped += 1;
  }

  return { sent, skipped };
}

/**
 * Fees (addendum 2, B2): instalments past their grace week become overdue,
 * and the student hears about it once.
 */
async function remindFees(institute: string): Promise<{
  markedOverdue: number;
  sent: number;
  skipped: number;
}> {
  const markedOverdue = await markOverdue();

  const overdue = await prisma.installment.findMany({
    where: { status: "OVERDUE" },
    include: {
      feePlan: {
        include: { student: { select: { id: true, name: true, phone: true } } },
      },
    },
    take: 200,
  });

  let sent = 0;
  let skipped = 0;
  for (const installment of overdue) {
    const student = installment.feePlan.student;
    const result = await sendTemplate({
      key: "installment-overdue",
      to: student.phone ?? "",
      values: {
        name: student.name,
        amount: String(installment.amount - installment.paidAmount),
        date: formatDate(installment.dueDate, "bn"),
        institute,
      },
      entity: "installment",
      entityId: installment.id,
      // Once per instalment, ever: an overdue fee must not become a daily text.
      dedupeKey: `installment-overdue:${installment.id}`,
    });
    if (result.sent) sent += 1;
    else skipped += 1;
  }

  return { markedOverdue, sent, skipped };
}

export async function runReminders(): Promise<ReminderSummary> {
  const settings = await getSiteSettings();
  const institute = settings.general.shortName || settings.general.nameEn;

  return {
    classStarting: await remindClassStarting(institute),
    appointments: await remindAppointments(institute),
    fees: await remindFees(institute),
  };
}

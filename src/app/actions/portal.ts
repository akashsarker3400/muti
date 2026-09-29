"use server";

import { revalidatePath } from "next/cache";

import { attendanceFor } from "@/lib/attendance";
import { feeSummary } from "@/lib/fees";
import { currentStudent, endSession, issueOtp, verifyOtp } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * The student portal (addendum 2, B12).
 *
 * Every one of these is also reachable as JSON under `/api/v1/portal/*`,
 * because section C says a mobile app must be able to do everything the
 * portal does without a feature living only inside a server component.
 */

export async function requestCode(
  phone: string,
): Promise<{ ok: boolean; error?: string }> {
  // A public endpoint that sends an SMS: capped, or it is a way to spend the
  // institute's balance on somebody else's phone.
  const limit = await checkRateLimit("otp");
  if (!limit.allowed) {
    return { ok: false, error: "Too many codes asked for. Try again in a few minutes." };
  }

  const result = await issueOtp(phone);
  if (!result.ok) return result;

  // No code means the number is not a student's. The answer is the same
  // either way: telling a stranger which numbers are students would hand out
  // the roll one guess at a time.
  if (result.code) {
    const settings = await getSiteSettings();
    const { sendMessage } = await import("@/lib/messaging");
    await sendMessage({
      channel: "SMS",
      to: phone,
      body: `আপনার কোড ${result.code}। ৫ মিনিটের মধ্যে ব্যবহার করুন। ${settings.general.shortName || "MUTI"}`,
      template: "portal-otp",
      entity: "portal",
    });
  }

  return { ok: true };
}

export async function signIn(
  phone: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const limit = await checkRateLimit("otp");
  if (!limit.allowed) {
    return { ok: false, error: "Too many tries. Wait a few minutes." };
  }

  const result = await verifyOtp(phone, code);
  if (!result.ok) return result;

  revalidatePath("/portal");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await endSession();
  revalidatePath("/portal");
}

/** Everything the portal home needs, in one call the app can make too. */
export async function myOverview() {
  const student = await currentStudent();
  if (!student) return null;

  const [attendance, fees, nextClass, notices] = await Promise.all([
    attendanceFor(student.id),
    feeSummary(student.id),
    student.batchId
      ? prisma.classSession.findFirst({
          where: {
            batchId: student.batchId,
            status: "PLANNED",
            date: { gte: new Date() },
          },
          orderBy: { date: "asc" },
          select: { id: true, date: true, startTime: true, topic: true },
        })
      : null,
    prisma.notice.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, titleEn: true, titleBn: true, createdAt: true },
    }),
  ]);

  return {
    student: {
      id: student.id,
      name: student.name,
      roll: student.roll,
      photo: student.photo,
      status: student.status,
      course: student.course.nameEn,
      batch: student.batch?.name ?? null,
    },
    attendance,
    fees,
    nextClass,
    notices,
  };
}

/** The student's own routine. */
export async function myRoutine() {
  const student = await currentStudent();
  if (!student?.batchId) return [];

  return prisma.classSession.findMany({
    where: { batchId: student.batchId },
    orderBy: { date: "asc" },
    take: 200,
    select: {
      id: true,
      date: true,
      startTime: true,
      topic: true,
      type: true,
      status: true,
      teacher: { select: { name: true } },
    },
  });
}

/** Their attendance, class by class. */
export async function myAttendance() {
  const student = await currentStudent();
  if (!student) return [];

  return prisma.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { session: { date: "desc" } },
    take: 200,
    select: {
      id: true,
      status: true,
      session: { select: { date: true, topic: true, status: true } },
    },
  });
}

/** Their instalments and receipts. */
export async function myFees() {
  const student = await currentStudent();
  if (!student) return null;

  const [plan, payments, summary] = await Promise.all([
    prisma.feePlan.findUnique({
      where: { studentId: student.id },
      include: { installments: { orderBy: { seq: "asc" } } },
    }),
    prisma.payment.findMany({
      where: { studentId: student.id, voidedAt: null },
      orderBy: { paidAt: "desc" },
      select: { id: true, receiptNo: true, amount: true, method: true, paidAt: true },
    }),
    feeSummary(student.id),
  ]);

  return { plan, payments, summary };
}

/** Their published results only: an unpublished mark is not theirs to see. */
export async function myResults() {
  const student = await currentStudent();
  if (!student) return [];

  return prisma.mark.findMany({
    where: { studentId: student.id, exam: { published: true } },
    orderBy: { exam: { date: "desc" } },
    select: {
      id: true,
      marks: true,
      grade: true,
      remark: true,
      exam: { select: { name: true, date: true, fullMarks: true, passMarks: true } },
    },
  });
}

/** Their certificates, and the public address that verifies each one. */
export async function myCertificates() {
  const student = await currentStudent();
  if (!student) return [];

  return prisma.certificate.findMany({
    where: { studentId: student.id, deletedAt: null, approvedAt: { not: null } },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      certificateNo: true,
      issuedAt: true,
      status: true,
      verifyToken: true,
      course: { select: { nameEn: true } },
    },
  });
}

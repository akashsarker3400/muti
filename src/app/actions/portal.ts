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

/* -------------------------------------------------------------------------- */
/* The course book and practice inside the portal (addendum 5, B1–B3)         */
/* -------------------------------------------------------------------------- */

/**
 * The chapters this student may read.
 *
 * Only a reviewed chapter, and only for a student whose course the book is
 * linked to: a book written for the diploma is not the certificate students'
 * to read, and an unreviewed chapter is not anybody's.
 */
export async function myBook() {
  const student = await currentStudent();
  if (!student) return null;
  if (student.status === "DROPPED") return null;

  // Not gated on the book's `published` flag: that one governs the public
  // marketing page, which waits on a cover image and a sample PDF. A student
  // who is enrolled should not be kept from a chapter a doctor has approved
  // because nobody has uploaded a cover yet.
  const book = await prisma.courseBook.findFirst({
    where: { courses: { some: { courseId: student.courseId } } },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: {
          content: { select: { reviewed: true } },
          progress: { where: { studentId: student.id }, select: { completedAt: true } },
          covered: student.batchId
            ? { where: { batchId: student.batchId }, select: { markedAt: true } }
            : false,
          _count: { select: { questions: { where: { reviewed: true } } } },
        },
      },
    },
  });
  if (!book) return null;

  return {
    title: book.title,
    chapters: book.chapters.map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      titleBn: chapter.titleBn,
      readable: chapter.content?.reviewed ?? false,
      done: chapter.progress.length > 0,
      covered: Array.isArray(chapter.covered) ? chapter.covered.length > 0 : false,
      questions: chapter._count.questions,
    })),
  };
}

/** One chapter's text, with the student's own roll for the watermark. */
export async function readChapter(chapterId: string) {
  const student = await currentStudent();
  if (!student || student.status === "DROPPED") return null;

  const chapter = await prisma.courseBookChapter.findFirst({
    where: {
      id: chapterId,
      content: { reviewed: true },
      book: { courses: { some: { courseId: student.courseId } } },
    },
    include: { content: true },
  });
  if (!chapter?.content) return null;

  return {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    bodyHtml: chapter.content.bodyHtml,
    // Stamped across the page: a screenshot that leaves the portal carries
    // the roll number of whoever took it.
    watermark: `${student.roll} · ${student.name}`,
  };
}

export async function markChapterRead(
  chapterId: string,
): Promise<{ ok: boolean }> {
  const student = await currentStudent();
  if (!student) return { ok: false };

  await prisma.bookProgress.upsert({
    where: { studentId_chapterId: { studentId: student.id, chapterId } },
    create: { studentId: student.id, chapterId },
    update: {},
  });
  revalidatePath("/portal/book");
  return { ok: true };
}

/** Approved questions for one chapter, without the answers. */
export async function practiceQuestions(chapterId: string) {
  const student = await currentStudent();
  if (!student) return [];

  const questions = await prisma.question.findMany({
    where: { chapterId, reviewed: true },
    select: { id: true, stem: true, options: true },
    take: 30,
  });

  // The correct index never leaves the server with the question: a page that
  // ships the answers is a quiz that teaches nothing.
  return questions;
}

/** Marks one answer and returns whether it was right. */
export async function answerQuestion(
  questionId: string,
  chosen: number,
): Promise<{ ok: boolean; correct?: boolean; explanation?: string | null }> {
  const student = await currentStudent();
  if (!student) return { ok: false };

  const question = await prisma.question.findFirst({
    where: { id: questionId, reviewed: true },
    select: { correctIndex: true, explanation: true },
  });
  if (!question) return { ok: false };

  const correct = question.correctIndex === chosen;
  await prisma.questionAttempt.create({
    data: { questionId, studentId: student.id, chosen, correct },
  });

  return { ok: true, correct, explanation: question.explanation };
}

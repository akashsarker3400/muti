"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import {
  DEFAULT_CERTIFICATE_FORMAT,
  renderCertificateNumber,
  seriesKey,
  type CertificateNumberParts,
} from "@/lib/certificate-number";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Allocates the next certificate number in its series (proposal stage 3).
 *
 * The running number comes from an atomic counter, so two people issuing at
 * the same moment cannot be handed the same number. Numbers the office typed
 * by hand are not in the counter, so the result is checked against the table
 * and the counter is advanced until a free one is found.
 */
export type NextNumberResult =
  { ok: true; certificateNo: string } | { ok: false; error: string };

export async function nextCertificateNumber(input: {
  courseId: string;
  type?: string;
  issuedAt?: string;
}): Promise<NextNumberResult> {
  const admin = await requirePermission("certificates.manage");

  // Every generated number is consumed from the series whether or not the
  // certificate is saved, so cap how fast they can be spent.
  const limit = await checkRateLimit("certificateNumber");
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Too many numbers generated in the last hour. Please try again later.",
    };
  }

  const course = input.courseId
    ? await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { code: true },
      })
    : null;
  if (!course) {
    return { ok: false, error: "Choose the course first, then press Generate." };
  }

  const settings = await getSiteSettings();
  const format =
    settings.documents.certificateNumberFormat || DEFAULT_CERTIFICATE_FORMAT;

  const issuedAt = parseDate(input.issuedAt) ?? new Date();
  const parts: CertificateNumberParts = {
    prefix: settings.documents.certificatePrefix,
    courseCode: course.code,
    type: input.type === "SEMESTER" || input.type === "BOARD" ? input.type : "COURSE",
    issuedAt,
  };

  try {
    const certificateNo = await allocateNumber(format, parts);
    if (!certificateNo) {
      return {
        ok: false,
        error: "Could not find a free number. Check the format in Site Settings.",
      };
    }
    // Audit: a number leaving the series is a fact the office may need to
    // account for later, even if the certificate is never saved.
    await logActivity(admin.id, "certificate-number", "certificate", certificateNo);
    return { ok: true, certificateNo };
  } catch (error) {
    console.error("nextCertificateNumber failed", error);
    return { ok: false, error: "Could not generate a number. Please try again." };
  }
}

/**
 * Takes the next free number out of one series.
 *
 * The running number comes from an atomic counter, so two people issuing at
 * the same moment cannot be handed the same one. Numbers the office typed by
 * hand are not in the counter, so the result is checked against the table and
 * the counter advanced until a free one is found; `null` means the series is
 * exhausted, which in practice means the format has no sequence in it.
 */
async function allocateNumber(
  format: string,
  parts: CertificateNumberParts,
): Promise<string | null> {
  const key = `certificate:${seriesKey(format, parts)}`;

  // At most a few spins: only numbers the office typed by hand can collide.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    const certificateNo = renderCertificateNumber(format, parts, counter.value);
    const taken = await prisma.certificate.findFirst({
      where: { certificateNo },
      select: { id: true },
    });
    if (!taken) return certificateNo;
  }
  return null;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ------------------------------------------------------------------------- *
 * Bulk issue, approval, print log and delivery register (proposal stage 3)
 * ------------------------------------------------------------------------- */

/**
 * Issues one certificate per selected student of a batch.
 *
 * Two roles, on purpose. Anyone with `certificates.manage` may prepare a whole
 * batch, which is the long part of the job; nothing prepared here can be
 * printed or handed over until somebody with `certificates.issue` approves it.
 * That is the paper workflow the office already follows, and it means a typo
 * in forty certificates is caught by the person who signs them rather than by
 * a student a year later.
 */
export type BulkIssueResult =
  | { ok: true; created: number; skipped: Array<{ name: string; reason: string }> }
  | { ok: false; error: string };

/** One run cannot spend more than this many numbers out of the series. */
const BULK_LIMIT = 100;

export async function issueCertificatesForBatch(input: {
  batchId: string;
  studentIds: string[];
  type: "COURSE" | "SEMESTER" | "BOARD";
  session?: string;
  issuedAt?: string;
  copyGrade?: boolean;
}): Promise<BulkIssueResult> {
  const admin = await requirePermission("certificates.manage");

  const ids = [...new Set(input.studentIds.filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false, error: "Tick at least one student." };
  }
  if (ids.length > BULK_LIMIT) {
    return {
      ok: false,
      error: `Issue at most ${BULK_LIMIT} certificates at a time. Tick fewer students and run it again.`,
    };
  }

  // One check for the whole run: from the office's side this is a single job,
  // and the per-run cap above is what keeps the series from being burnt.
  const limit = await checkRateLimit("certificateNumber", `bulk:${admin.id}`);
  if (!limit.allowed) {
    return {
      ok: false,
      error: "Too many issuing runs in the last hour. Please try again later.",
    };
  }

  const batch = await prisma.batch.findUnique({
    where: { id: input.batchId },
    select: {
      id: true,
      name: true,
      courseId: true,
      course: { select: { code: true } },
    },
  });
  if (!batch) return { ok: false, error: "That batch no longer exists." };

  const students = await prisma.student.findMany({
    // Only students of this batch: the form cannot be used to reach anyone else.
    where: { id: { in: ids }, batchId: batch.id },
    select: { id: true, name: true, roll: true, resultGrade: true },
    orderBy: { roll: "asc" },
  });
  if (students.length === 0) {
    return { ok: false, error: "None of those students are in this batch." };
  }

  const settings = await getSiteSettings();
  const format =
    settings.documents.certificateNumberFormat || DEFAULT_CERTIFICATE_FORMAT;
  const issuedAt = parseDate(input.issuedAt) ?? new Date();
  const parts: CertificateNumberParts = {
    prefix: settings.documents.certificatePrefix,
    courseCode: batch.course.code,
    type: input.type,
    issuedAt,
  };

  // Already issued for this course and type: the office is re-running the
  // page after adding one late student, which must not produce duplicates.
  const existing = await prisma.certificate.findMany({
    where: {
      studentId: { in: students.map((student) => student.id) },
      courseId: batch.courseId,
      type: input.type,
      deletedAt: null,
    },
    select: { studentId: true, certificateNo: true },
  });
  const alreadyIssued = new Map(
    existing.map((row) => [row.studentId, row.certificateNo]),
  );

  const skipped: Array<{ name: string; reason: string }> = [];
  let created = 0;

  for (const student of students) {
    const has = alreadyIssued.get(student.id);
    if (has) {
      skipped.push({ name: student.name, reason: `already has ${has}` });
      continue;
    }

    const number = await allocateNumber(format, parts);
    if (!number) {
      skipped.push({ name: student.name, reason: "no free number in the series" });
      continue;
    }

    try {
      const certificate = await prisma.certificate.create({
        data: {
          certificateNo: number,
          studentId: student.id,
          courseId: batch.courseId,
          type: input.type,
          batchName: batch.name,
          session: input.session?.trim() || null,
          issuedAt,
          grade: input.copyGrade ? student.resultGrade : null,
          issuedById: admin.id,
        },
        select: { id: true },
      });
      created += 1;
      await logActivity(admin.id, "certificate-issue", "certificate", certificate.id);
    } catch (error) {
      console.error("Bulk issue failed for one student", error);
      skipped.push({ name: student.name, reason: "could not be saved" });
    }
  }

  revalidatePath("/admin/certificates");
  revalidatePath("/admin/certificates/register");
  return { ok: true, created, skipped };
}

/**
 * Approval. Only an approved certificate may be printed or handed over, so
 * this is the one action in the flow held behind `certificates.issue`.
 */
export async function setCertificateApproval(
  ids: string[],
  approve: boolean,
): Promise<{ ok: boolean; changed?: number; error?: string }> {
  const admin = await requirePermission("certificates.issue");
  const wanted = [...new Set(ids.filter(Boolean))];
  if (wanted.length === 0) return { ok: false, error: "Nothing selected." };

  try {
    if (approve) {
      // A revoked certificate cannot be approved: it would then be printable.
      const result = await prisma.certificate.updateMany({
        where: { id: { in: wanted }, deletedAt: null, status: "VALID" },
        data: { approvedAt: new Date(), approvedById: admin.id },
      });
      for (const id of wanted) {
        await logActivity(admin.id, "certificate-approve", "certificate", id);
      }
      revalidatePath("/admin/certificates");
      revalidatePath("/admin/certificates/register");
      return { ok: true, changed: result.count };
    }

    // Withdrawing approval after handover would leave the register lying, so
    // a delivered certificate keeps its approval.
    const result = await prisma.certificate.updateMany({
      where: { id: { in: wanted }, deletedAt: null, deliveredAt: null },
      data: { approvedAt: null, approvedById: null },
    });
    for (const id of wanted) {
      await logActivity(admin.id, "certificate-unapprove", "certificate", id);
    }
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/certificates/register");
    return { ok: true, changed: result.count };
  } catch (error) {
    console.error("setCertificateApproval failed", error);
    return { ok: false, error: "Could not save that. Please try again." };
  }
}

/**
 * Writes one row of the print log. Called by the print page itself once the
 * browser's print dialog has been opened, so the log answers "who printed
 * this, and how many times" without anybody having to remember to record it.
 */
export async function recordCertificatePrint(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("certificates.manage");
  const certificate = await prisma.certificate.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, approvedAt: true, status: true },
  });
  if (!certificate) return { ok: false, error: "That certificate no longer exists." };
  if (!certificate.approvedAt || certificate.status !== "VALID") {
    return { ok: false, error: "Only an approved certificate can be printed." };
  }

  try {
    await prisma.certificatePrint.create({
      data: { certificateId: id, userId: admin.id },
    });
    revalidatePath("/admin/certificates/register");
    return { ok: true };
  } catch (error) {
    console.error("recordCertificatePrint failed", error);
    return { ok: false, error: "Could not record the print." };
  }
}

/** The handover register: who took the certificate away, and when. */
export async function recordCertificateDelivery(input: {
  id: string;
  deliveredTo: string;
  deliveredAt?: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("certificates.manage");
  const taker = input.deliveredTo.trim();
  if (!taker) {
    return { ok: false, error: "Write who collected it." };
  }

  const certificate = await prisma.certificate.findFirst({
    where: { id: input.id, deletedAt: null },
    select: { id: true, approvedAt: true, status: true },
  });
  if (!certificate) return { ok: false, error: "That certificate no longer exists." };
  if (!certificate.approvedAt || certificate.status !== "VALID") {
    return { ok: false, error: "Only an approved certificate can be handed over." };
  }

  try {
    await prisma.certificate.update({
      where: { id: input.id },
      data: {
        deliveredAt: parseDate(input.deliveredAt) ?? new Date(),
        deliveredTo: taker,
        deliveryNote: input.note?.trim() || null,
      },
    });
    await logActivity(admin.id, "certificate-deliver", "certificate", input.id);
    revalidatePath("/admin/certificates/register");
    return { ok: true };
  } catch (error) {
    console.error("recordCertificateDelivery failed", error);
    return { ok: false, error: "Could not save the handover." };
  }
}

/** Undo a handover recorded against the wrong student. */
export async function clearCertificateDelivery(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("certificates.manage");
  try {
    await prisma.certificate.update({
      where: { id },
      data: { deliveredAt: null, deliveredTo: null, deliveryNote: null },
    });
    await logActivity(admin.id, "certificate-deliver-undo", "certificate", id);
    revalidatePath("/admin/certificates/register");
    return { ok: true };
  } catch (error) {
    console.error("clearCertificateDelivery failed", error);
    return { ok: false, error: "Could not undo that." };
  }
}

/**
 * "Your certificate is ready, please collect it" by SMS.
 *
 * Kept off the approval action on purpose: approving forty certificates must
 * stay instant, and the office often approves in the evening but wants the
 * students told in the morning. One message per certificate, ever.
 */
export async function notifyCertificateReady(
  ids: string[],
): Promise<{ ok: boolean; sent?: number; skipped?: number; error?: string }> {
  const admin = await requirePermission("certificates.manage");
  const wanted = [...new Set(ids.filter(Boolean))].slice(0, 100);
  if (wanted.length === 0) return { ok: false, error: "Nothing selected." };

  const { sendTemplate } = await import("@/lib/messaging");
  const settings = await getSiteSettings();
  const institute = settings.general.shortName || settings.general.nameEn;

  const certificates = await prisma.certificate.findMany({
    where: { id: { in: wanted }, deletedAt: null, approvedAt: { not: null } },
    select: {
      id: true,
      student: { select: { name: true, phone: true, roll: true } },
      course: { select: { nameEn: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  for (const certificate of certificates) {
    const result = await sendTemplate({
      key: "certificate-ready",
      to: certificate.student.phone ?? "",
      values: {
        name: certificate.student.name,
        roll: certificate.student.roll,
        course: certificate.course.nameEn,
        institute,
      },
      entity: "certificate",
      entityId: certificate.id,
      dedupeKey: `certificate-ready:${certificate.id}`,
      userId: admin.id,
    });
    if (result.sent) sent += 1;
    else skipped += 1;
  }

  revalidatePath("/admin/certificates/register");
  return { ok: true, sent, skipped };
}

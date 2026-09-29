"use server";

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

  const key = `certificate:${seriesKey(format, parts)}`;

  try {
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
      if (!taken) {
        // Audit: a number leaving the series is a fact the office may need to
        // account for later, even if the certificate is never saved.
        await logActivity(admin.id, "certificate-number", "certificate", certificateNo);
        return { ok: true, certificateNo };
      }
    }
    return {
      ok: false,
      error: "Could not find a free number. Check the format in Site Settings.",
    };
  } catch (error) {
    console.error("nextCertificateNumber failed", error);
    return { ok: false, error: "Could not generate a number. Please try again." };
  }
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

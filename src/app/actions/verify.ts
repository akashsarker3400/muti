"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizeBmdc, normalizeCertificateNo } from "@/lib/verify";
import { verifySchema } from "@/lib/validation";

/**
 * Public certificate verification (addendum 3, §1). Looks up issued
 * certificates by their printed number or by the holder's BMDC number.
 *
 * The searcher already holds the number they type, so the full name is shown
 * — the protection against enumeration is the rate limit (20/min/IP), the
 * optional Turnstile check, and the log every lookup leaves behind.
 */

export type VerifiedCertificate = {
  name: string;
  course: string;
  courseBn: string;
  batch: string | null;
  session: string | null;
  certificateNo: string;
  type: string;
  issuedAt: string | null;
  grade: string | null;
  status: "VALID" | "REVOKED";
  revokedReason: string | null;
};

export type VerifyResult =
  | { status: "found"; certificates: VerifiedCertificate[] }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "captcha" }
  | { status: "invalid" };

export type VerifyMode = "certificate" | "bmdc";

const CERT_INCLUDE = { student: true, course: true } as const;

function shape(row: {
  certificateNo: string;
  type: string;
  batchName: string | null;
  session: string | null;
  issuedAt: Date | null;
  grade: string | null;
  status: "VALID" | "REVOKED";
  revokedReason: string | null;
  student: { name: string };
  course: { fullNameEn: string; fullNameBn: string };
}): VerifiedCertificate {
  return {
    name: row.student.name,
    course: row.course.fullNameEn,
    courseBn: row.course.fullNameBn,
    batch: row.batchName,
    session: row.session,
    certificateNo: row.certificateNo,
    type: row.type,
    issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
    grade: row.grade,
    status: row.status,
    revokedReason: row.revokedReason,
  };
}

async function log(query: string, type: string, found: boolean) {
  try {
    await prisma.verificationLog.create({
      data: { query: query.slice(0, 120), type, found, ip: await clientIp() },
    });
  } catch (error) {
    console.error("verification log failed", error);
  }
}

export async function verifyCertificate(input: {
  mode: VerifyMode;
  query: string;
  turnstileToken?: string;
}): Promise<VerifyResult> {
  const parsed = verifySchema.safeParse({ query: input.query });
  if (!parsed.success) return { status: "invalid" };

  const limit = await checkRateLimit("verify");
  if (!limit.allowed) return { status: "rate-limited" };

  const settings = await getSiteSettings();
  const human = await verifyTurnstile(
    input.turnstileToken,
    settings.security.turnstileSecretKey,
    await clientIp(),
  );
  if (!human) return { status: "captcha" };

  const mode: VerifyMode = input.mode === "bmdc" ? "bmdc" : "certificate";

  const rows =
    mode === "bmdc"
      ? await prisma.certificate.findMany({
          where: {
            deletedAt: null,
            student: { bmdcNormalized: normalizeBmdc(parsed.data.query) },
          },
          include: CERT_INCLUDE,
          orderBy: { issuedAt: "desc" },
        })
      : await prisma.certificate.findMany({
          where: {
            deletedAt: null,
            certificateNo: {
              equals: normalizeCertificateNo(parsed.data.query),
              mode: "insensitive",
            },
          },
          include: CERT_INCLUDE,
          take: 1,
        });

  await log(parsed.data.query, mode, rows.length > 0);

  if (rows.length === 0) return { status: "not-found" };
  return { status: "found", certificates: rows.map(shape) };
}

/** `/verify?t=<token>` — the QR code printed on the certificate. */
export async function verifyByToken(
  token: string,
): Promise<VerifiedCertificate | null> {
  if (!token || token.length > 80) return null;
  const row = await prisma.certificate.findFirst({
    where: { verifyToken: token, deletedAt: null },
    include: CERT_INCLUDE,
  });
  await log(`t:${token}`, "token", Boolean(row));
  return row ? shape(row) : null;
}

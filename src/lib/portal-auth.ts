import "server-only";

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { normalizePhone, phoneVariants } from "@/lib/phone";

/**
 * The student portal's own login (addendum 2, B12).
 *
 * Phone and a one-time code, kept entirely separate from the admin session:
 * a student signing in must never end up holding anything the office holds,
 * and the two cookies never meet.
 *
 * Both the code and the session token are stored hashed. A database dump
 * should not be a list of working logins, even for the five minutes each code
 * lives.
 */

const COOKIE = "muti_portal";
const CODE_MINUTES = 5;
const SESSION_DAYS = 30;
/** Wrong guesses allowed before a code is spent. */
const MAX_ATTEMPTS = 5;

function hash(value: string): string {
  return createHash("sha256").update(`portal:${value}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type OtpResult =
  | { ok: true; expiresAt: Date; code?: string }
  | { ok: false; error: string };

/**
 * Issues a code for a phone number that belongs to a student.
 *
 * An unknown number gets the same answer as a known one. Telling a stranger
 * which numbers are students would be a roll of the institute's students,
 * handed out one guess at a time.
 */
export async function issueOtp(phoneInput: string): Promise<OtpResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Enter a valid Bangladeshi mobile number." };

  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
  const student = await prisma.student.findFirst({
    where: { phone: { in: phoneVariants(phone) }, deletedAt: null },
    select: { id: true },
  });
  if (!student) return { ok: true, expiresAt };

  const code = String(randomInt(100_000, 999_999));
  await prisma.otp.create({
    data: { phone, codeHash: hash(code), expiresAt },
  });

  return { ok: true, expiresAt, code };
}

export type VerifyResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

/** Checks a code and starts a session. */
export async function verifyOtp(
  phoneInput: string,
  code: string,
): Promise<VerifyResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Enter a valid mobile number." };

  const otp = await prisma.otp.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "That code has expired. Ask for a new one." };

  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many wrong tries. Ask for a new code." };
  }

  if (!safeEqual(otp.codeHash, hash(code.trim()))) {
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "That code is not right." };
  }

  const student = await prisma.student.findFirst({
    where: { phone: { in: phoneVariants(phone) }, deletedAt: null },
    select: { id: true },
  });
  if (!student) return { ok: false, error: "No student record uses this number." };

  await prisma.otp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  await startSession(student.id);
  return { ok: true, studentId: student.id };
}

async function startSession(studentId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);

  await prisma.portalSession.create({
    data: { studentId, tokenHash: hash(token), expiresAt },
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in student, or null. Never throws. */
export async function currentStudent() {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;

    const session = await prisma.portalSession.findUnique({
      where: { tokenHash: hash(token) },
      include: {
        student: {
          include: {
            course: { select: { nameEn: true, nameBn: true, code: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!session || session.expiresAt < new Date()) return null;
    if (session.student.deletedAt) return null;

    return session.student;
  } catch (error) {
    console.error("currentStudent failed", error);
    return null;
  }
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.portalSession
      .deleteMany({ where: { tokenHash: hash(token) } })
      .catch(() => undefined);
  }
  jar.delete(COOKIE);
}

/** For the JSON API: the bearer token a mobile app would send. */
export async function studentForToken(token: string) {
  const session = await prisma.portalSession.findUnique({
    where: { tokenHash: hash(token) },
    include: { student: true },
  });
  if (!session || session.expiresAt < new Date() || session.student.deletedAt) {
    return null;
  }
  return session.student;
}

export { COOKIE as PORTAL_COOKIE, SESSION_DAYS, hash as hashPortalToken };

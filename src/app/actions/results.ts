"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizeBmdc, normalizeRoll } from "@/lib/verify";

/**
 * Public board-result search by roll or registration number (addendum 3,
 * §2). Only published exams answer. Same protection as /verify: rate limit,
 * optional Turnstile, and a log row per lookup.
 */

export type ResultMode = "roll" | "registration" | "bmdc";

export type FoundResult = {
  id: string;
  examTitle: string;
  session: string;
  heldIn: string | null;
  publishedOn: string | null;
  boardName: string;
  noticeFile: string | null;
  courseBn: string | null;
  courseEn: string | null;
  roll: string;
  registrationNo: string | null;
  studentName: string | null;
  status: "PASS" | "FAIL" | "WITHHELD" | "ABSENT";
  gpa: string | null;
  failedSubjects: string | null;
  remark: string | null;
};

export type ResultSearch =
  | { status: "found"; results: FoundResult[] }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "captcha" }
  | { status: "invalid" };

const inputSchema = z.object({
  mode: z.enum(["roll", "registration", "bmdc"]).default("roll"),
  query: z.string().trim().min(4).max(30),
  examId: z.string().trim().max(40).optional(),
  turnstileToken: z.string().optional(),
});

export async function searchBoardResults(raw: unknown): Promise<ResultSearch> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid" };
  const { mode, examId, turnstileToken } = parsed.data;
  const query =
    mode === "bmdc"
      ? normalizeBmdc(parsed.data.query)
      : normalizeRoll(parsed.data.query);
  if (query.length < 4) return { status: "invalid" };

  const limit = await checkRateLimit("verify");
  if (!limit.allowed) return { status: "rate-limited" };

  const settings = await getSiteSettings();
  const human = await verifyTurnstile(
    turnstileToken,
    settings.security.turnstileSecretKey,
    await clientIp(),
  );
  if (!human) return { status: "captcha" };

  /**
   * A BMDC search goes through the student: rows linked to them, plus rows
   * carrying their board roll that were never linked.
   */
  const byBmdc =
    mode === "bmdc"
      ? await prisma.student.findMany({
          where: { bmdcNormalized: query },
          select: { id: true, boardRoll: true },
        })
      : [];
  const where =
    mode === "roll"
      ? { roll: query }
      : mode === "registration"
        ? { registrationNo: query }
        : {
            OR: [
              { studentId: { in: byBmdc.map((s) => s.id) } },
              {
                roll: { in: byBmdc.flatMap((s) => (s.boardRoll ? [s.boardRoll] : [])) },
              },
            ],
          };

  const rows = await prisma.boardResult.findMany({
    where: {
      ...where,
      boardExam: { published: true, ...(examId ? { id: examId } : {}) },
    },
    include: {
      boardExam: { include: { course: { select: { nameBn: true, nameEn: true } } } },
      student: { select: { name: true, nameBn: true } },
    },
    orderBy: { boardExam: { publishedOn: "desc" } },
  });

  try {
    await prisma.verificationLog.create({
      data: {
        query,
        type: mode === "bmdc" ? "result-bmdc" : mode,
        found: rows.length > 0,
        ip: await clientIp(),
      },
    });
  } catch (error) {
    console.error("verification log failed", error);
  }

  if (rows.length === 0) return { status: "not-found" };

  // Rows that were never linked still get a name if a student holds that roll.
  const unlinkedRolls = rows
    .filter((r) => !r.studentId && !r.studentName)
    .map((r) => r.roll);
  const holders = unlinkedRolls.length
    ? await prisma.student.findMany({
        where: { boardRoll: { in: unlinkedRolls } },
        select: { boardRoll: true, name: true },
      })
    : [];
  const nameByRoll = new Map(holders.map((s) => [s.boardRoll!, s.name]));

  return {
    status: "found",
    results: rows.map((row) => ({
      id: row.id,
      examTitle: row.boardExam.title,
      session: row.boardExam.session,
      heldIn: row.boardExam.heldIn,
      publishedOn: row.boardExam.publishedOn?.toISOString() ?? null,
      boardName: row.boardExam.boardName,
      noticeFile: row.boardExam.noticeFile,
      courseBn: row.boardExam.course?.nameBn ?? null,
      courseEn: row.boardExam.course?.nameEn ?? null,
      roll: row.roll,
      registrationNo: row.registrationNo,
      studentName:
        row.studentName ?? row.student?.name ?? nameByRoll.get(row.roll) ?? null,
      status: row.status,
      gpa: row.gpa ? row.gpa.toFixed(2) : null,
      failedSubjects: row.failedSubjects,
      remark: row.remark,
    })),
  };
}

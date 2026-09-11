"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { normalizeRoll } from "@/lib/verify";

/** Board result rows for one exam (addendum 3, §2). */

const rowSchema = z.object({
  roll: z.string().trim().min(1, "Roll is required"),
  registrationNo: z.string().trim().default(""),
  studentName: z.string().trim().default(""),
  status: z.enum(["PASS", "FAIL", "WITHHELD", "ABSENT"]).default("PASS"),
  gpa: z.string().trim().default(""),
  failedSubjects: z.string().trim().default(""),
  remark: z.string().trim().default(""),
});

export type BoardResultRow = z.infer<typeof rowSchema>;

export type SaveRowsResult = {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  linked?: number;
  errors?: Array<{ row: number; message: string }>;
};

function toGpa(value: string): { gpa: number | null; error?: string } {
  if (!value) return { gpa: null };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
    return { gpa: null, error: "GPA must be between 0 and 5" };
  }
  return { gpa: Math.round(parsed * 100) / 100 };
}

/**
 * Upserts every row on (examId, roll). Rows whose roll matches a student's
 * `boardRoll` are linked to that student on the way in.
 */
export async function saveBoardResultRows(
  examId: string,
  rawRows: unknown[],
): Promise<SaveRowsResult> {
  const admin = await requirePermission("results.manage");

  const exam = await prisma.boardExam.findUnique({ where: { id: examId } });
  if (!exam) return { ok: false, error: "Exam not found." };

  const errors: Array<{ row: number; message: string }> = [];
  const rows: Array<
    BoardResultRow & { rollNormalized: string; gpaValue: number | null }
  > = [];

  rawRows.forEach((raw, index) => {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: index + 1,
        message: parsed.error.issues[0]?.message ?? "Invalid rows",
      });
      return;
    }
    const rollNormalized = normalizeRoll(parsed.data.roll);
    if (rollNormalized.length < 4) {
      errors.push({ row: index + 1, message: "Roll must be numeric" });
      return;
    }
    const { gpa, error } = toGpa(parsed.data.gpa);
    if (error) {
      errors.push({ row: index + 1, message: error });
      return;
    }
    rows.push({ ...parsed.data, rollNormalized, gpaValue: gpa });
  });

  if (rows.length === 0) {
    return { ok: false, error: "No valid rows to save.", errors };
  }

  const [students, existing] = await Promise.all([
    prisma.student.findMany({
      where: { boardRoll: { in: rows.map((row) => row.rollNormalized) } },
      select: { id: true, boardRoll: true },
    }),
    prisma.boardResult.findMany({
      where: {
        boardExamId: examId,
        roll: { in: rows.map((row) => row.rollNormalized) },
      },
      select: { roll: true },
    }),
  ]);
  const byRoll = new Map(students.map((s) => [s.boardRoll!, s.id]));
  const existingRolls = new Set(existing.map((row) => row.roll));

  let linked = 0;

  // Chunked so a 2,000-row paste does not hold one transaction open too long.
  for (let start = 0; start < rows.length; start += 200) {
    const chunk = rows.slice(start, start + 200);
    await prisma.$transaction(
      chunk.map((row) => {
        const studentId = byRoll.get(row.rollNormalized) ?? null;
        if (studentId) linked += 1;
        const data = {
          registrationNo: row.registrationNo
            ? normalizeRoll(row.registrationNo) || row.registrationNo
            : null,
          studentName: row.studentName || null,
          studentId,
          status: row.status,
          gpa: row.gpaValue,
          failedSubjects: row.failedSubjects || null,
          remark: row.remark || null,
        };
        return prisma.boardResult.upsert({
          where: {
            boardExamId_roll: { boardExamId: examId, roll: row.rollNormalized },
          },
          create: { boardExamId: examId, roll: row.rollNormalized, ...data },
          update: data,
        });
      }),
    );
  }

  const updated = rows.filter((row) => existingRolls.has(row.rollNormalized)).length;
  const created = rows.length - updated;

  await logActivity(admin.id, "import", "boardResult", examId);
  revalidatePath(`/admin/board-exams/${examId}/results`);
  revalidatePath("/results");

  return { ok: true, created, updated, linked, errors };
}

export async function deleteBoardResultRow(id: string): Promise<{ ok: boolean }> {
  const admin = await requirePermission("results.manage");
  const row = await prisma.boardResult.delete({ where: { id } });
  await logActivity(admin.id, "delete", "boardResult", id);
  revalidatePath(`/admin/board-exams/${row.boardExamId}/results`);
  return { ok: true };
}

/** Links unlinked rows to students whose `boardRoll` matches. */
export async function autoLinkBoardResults(
  examId: string,
): Promise<{ ok: boolean; linked: number }> {
  const admin = await requirePermission("results.manage");
  const rows = await prisma.boardResult.findMany({
    where: { boardExamId: examId, studentId: null },
    select: { id: true, roll: true },
  });
  if (rows.length === 0) return { ok: true, linked: 0 };

  const students = await prisma.student.findMany({
    where: { boardRoll: { in: rows.map((row) => row.roll) } },
    select: { id: true, boardRoll: true },
  });
  const byRoll = new Map(students.map((s) => [s.boardRoll!, s.id]));

  const updates = rows
    .filter((row) => byRoll.has(row.roll))
    .map((row) =>
      prisma.boardResult.update({
        where: { id: row.id },
        data: { studentId: byRoll.get(row.roll)! },
      }),
    );
  if (updates.length > 0) await prisma.$transaction(updates);

  await logActivity(admin.id, "link", "boardResult", examId);
  revalidatePath(`/admin/board-exams/${examId}/results`);
  return { ok: true, linked: updates.length };
}

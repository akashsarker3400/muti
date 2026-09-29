"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { gradeFor, parseScale } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

/** Internal examinations and their marks (addendum 2, B3). */

export async function saveExam(input: {
  id?: string;
  batchId: string;
  name: string;
  date?: string;
  fullMarks?: number;
  passMarks?: number;
  note?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await requirePermission("exams.manage");

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the examination a name." };

  const fullMarks = Math.round(input.fullMarks ?? 100);
  const passMarks = Math.round(input.passMarks ?? 40);
  if (fullMarks <= 0) return { ok: false, error: "Full marks must be more than zero." };
  if (passMarks > fullMarks) {
    return { ok: false, error: "The pass mark cannot be higher than the full marks." };
  }

  const date = input.date ? new Date(`${input.date}T00:00:00.000Z`) : null;
  const data = {
    batchId: input.batchId,
    name,
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    fullMarks,
    passMarks,
    note: input.note?.trim() || null,
  };

  try {
    const exam = input.id
      ? await prisma.exam.update({ where: { id: input.id }, data })
      : await prisma.exam.create({ data });
    await logActivity(admin.id, input.id ? "exam-save" : "exam-create", "exam", exam.id);
    revalidatePath(`/admin/batches/${input.batchId}/exams`);
    return { ok: true, id: exam.id };
  } catch (error) {
    console.error("saveExam failed", error);
    return { ok: false, error: "Could not save the examination." };
  }
}

export async function deleteExam(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("exams.manage");
  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { batchId: true, published: true },
    });
    if (!exam) return { ok: false, error: "That examination no longer exists." };
    if (exam.published) {
      return {
        ok: false,
        error: "This examination is published. Unpublish it before deleting it.",
      };
    }
    await prisma.exam.delete({ where: { id } });
    await logActivity(admin.id, "exam-delete", "exam", id);
    revalidatePath(`/admin/batches/${exam.batchId}/exams`);
    return { ok: true };
  } catch (error) {
    console.error("deleteExam failed", error);
    return { ok: false, error: "Could not delete the examination." };
  }
}

/**
 * Saves the whole marks grid at once.
 *
 * The grade is computed here rather than typed: a grade and a mark that
 * disagree is the one mistake nobody spots until a student brings the sheet
 * back. A blank mark means the student did not sit, which is different from
 * a zero.
 */
export async function saveMarks(input: {
  examId: string;
  marks: Array<{ studentId: string; marks: number | null; remark?: string }>;
}): Promise<{ ok: boolean; saved?: number; error?: string }> {
  const admin = await requirePermission("exams.manage");

  const exam = await prisma.exam.findUnique({
    where: { id: input.examId },
    select: { id: true, batchId: true, fullMarks: true },
  });
  if (!exam) return { ok: false, error: "That examination no longer exists." };

  const settings = await getSiteSettings();
  const scale = parseScale(settings.results.gradeScale);

  const students = await prisma.student.findMany({
    where: { batchId: exam.batchId, deletedAt: null },
    select: { id: true },
  });
  const known = new Set(students.map((student) => student.id));

  const rows = input.marks
    .filter((row) => known.has(row.studentId))
    .map((row) => {
      const marks =
        row.marks === null || row.marks === undefined || Number.isNaN(row.marks)
          ? null
          : Math.max(0, Math.min(exam.fullMarks, Math.round(row.marks)));
      return {
        studentId: row.studentId,
        marks,
        grade: gradeFor(marks, exam.fullMarks, scale)?.grade ?? null,
        remark: row.remark?.trim() || null,
      };
    });

  try {
    await prisma.$transaction(
      rows.map((row) =>
        prisma.mark.upsert({
          where: { examId_studentId: { examId: exam.id, studentId: row.studentId } },
          create: { examId: exam.id, ...row },
          update: { marks: row.marks, grade: row.grade, remark: row.remark },
        }),
      ),
    );
    await logActivity(admin.id, "marks", "exam", exam.id);
    revalidatePath(`/admin/exams/${exam.id}`);
    return { ok: true, saved: rows.length };
  } catch (error) {
    console.error("saveMarks failed", error);
    return { ok: false, error: "Could not save the marks." };
  }
}

/**
 * Publishing tells the students. Held behind `results.publish` because it is
 * a public commitment: a mark that goes out cannot be quietly corrected.
 */
export async function publishExam(
  id: string,
  published: boolean,
): Promise<{ ok: boolean; notified?: number; error?: string }> {
  const admin = await requirePermission("results.publish");

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      batch: { select: { id: true, name: true } },
      marks: {
        include: { student: { select: { id: true, name: true, phone: true } } },
      },
    },
  });
  if (!exam) return { ok: false, error: "That examination no longer exists." };

  if (published && exam.marks.length === 0) {
    return { ok: false, error: "Enter the marks before publishing." };
  }

  try {
    await prisma.exam.update({
      where: { id },
      data: { published, publishedAt: published ? new Date() : null },
    });
    await logActivity(admin.id, published ? "exam-publish" : "exam-unpublish", "exam", id);
    revalidatePath(`/admin/exams/${id}`);
    revalidatePath(`/admin/batches/${exam.batch.id}/exams`);

    if (!published) return { ok: true, notified: 0 };

    const settings = await getSiteSettings();
    const { sendTemplate } = await import("@/lib/messaging");
    let notified = 0;
    for (const mark of exam.marks) {
      const result = await sendTemplate({
        key: "result-published",
        to: mark.student.phone ?? "",
        values: {
          name: mark.student.name,
          course: exam.name,
          institute: settings.general.shortName || settings.general.nameEn,
        },
        entity: "exam",
        entityId: exam.id,
        // Once per student per examination, however often it is republished.
        dedupeKey: `result-published:${exam.id}:${mark.student.id}`,
        userId: admin.id,
      });
      if (result.sent) notified += 1;
    }

    return { ok: true, notified };
  } catch (error) {
    console.error("publishExam failed", error);
    return { ok: false, error: "Could not change the publication state." };
  }
}

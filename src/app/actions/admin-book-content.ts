"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";

/**
 * The course book inside the portal (addendum 5, B1) and the question bank
 * (B2).
 *
 * Two rules run through all of it. Nothing is generated: the book is the
 * institute's own work and a wrong answer in an ultrasound question is a
 * clinical error, not a typo. And nothing reaches a student until a doctor has
 * marked it reviewed.
 */

export async function saveChapterContent(input: {
  chapterId: string;
  bodyHtml: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("book.content.edit");

  const bodyHtml = sanitizeRichText(input.bodyHtml);
  if (!bodyHtml.trim()) {
    return { ok: false, error: "The chapter is empty." };
  }

  try {
    const existing = await prisma.courseBookContent.findUnique({
      where: { chapterId: input.chapterId },
      select: { id: true, version: true },
    });

    await prisma.courseBookContent.upsert({
      where: { chapterId: input.chapterId },
      create: { chapterId: input.chapterId, bodyHtml },
      update: {
        bodyHtml,
        version: (existing?.version ?? 0) + 1,
        // Editing takes the review off: what a doctor approved is not what
        // the students would now be reading.
        reviewed: false,
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    await logActivity(admin.id, "book-content", "chapter", input.chapterId);
    revalidatePath("/admin/course-book");
    return { ok: true };
  } catch (error) {
    console.error("saveChapterContent failed", error);
    return { ok: false, error: "Could not save the chapter." };
  }
}

/** A doctor's approval, without which students see nothing. */
export async function reviewChapter(input: {
  chapterId: string;
  reviewer: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("questions.approve");
  const reviewer = input.reviewer.trim();
  if (!reviewer) {
    return { ok: false, error: "Write the name of the doctor who checked it." };
  }

  try {
    await prisma.courseBookContent.update({
      where: { chapterId: input.chapterId },
      data: { reviewed: true, reviewedBy: reviewer, reviewedAt: new Date() },
    });
    await logActivity(admin.id, "book-review", "chapter", input.chapterId);
    revalidatePath("/admin/course-book");
    return { ok: true };
  } catch (error) {
    console.error("reviewChapter failed", error);
    return { ok: false, error: "Could not record the review." };
  }
}

export async function saveQuestion(input: {
  id?: string;
  chapterId: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("questions.manage");

  const stem = input.stem.trim();
  const options = input.options.map((option) => option.trim()).filter(Boolean);

  if (!stem) return { ok: false, error: "Write the question." };
  if (options.length < 2) return { ok: false, error: "Give at least two choices." };
  if (input.correctIndex < 0 || input.correctIndex >= options.length) {
    return { ok: false, error: "Mark which choice is correct." };
  }

  const data = {
    chapterId: input.chapterId,
    stem,
    options,
    correctIndex: input.correctIndex,
    explanation: input.explanation?.trim() || null,
    // Any edit needs approving again: a changed question is a new question.
    reviewed: false,
    reviewedBy: null,
  };

  try {
    const question = input.id
      ? await prisma.question.update({ where: { id: input.id }, data })
      : await prisma.question.create({ data });
    await logActivity(admin.id, "question", "question", question.id);
    revalidatePath("/admin/questions");
    return { ok: true };
  } catch (error) {
    console.error("saveQuestion failed", error);
    return { ok: false, error: "Could not save the question." };
  }
}

export async function approveQuestion(
  id: string,
  reviewer: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("questions.approve");
  if (!reviewer.trim()) {
    return { ok: false, error: "Write the name of the doctor who approved it." };
  }

  try {
    await prisma.question.update({
      where: { id },
      data: { reviewed: true, reviewedBy: reviewer.trim() },
    });
    await logActivity(admin.id, "question-approve", "question", id);
    revalidatePath("/admin/questions");
    return { ok: true };
  } catch (error) {
    console.error("approveQuestion failed", error);
    return { ok: false, error: "Could not approve the question." };
  }
}

export async function deleteQuestion(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("questions.manage");
  try {
    await prisma.question.delete({ where: { id } });
    await logActivity(admin.id, "question-delete", "question", id);
    revalidatePath("/admin/questions");
    return { ok: true };
  } catch (error) {
    console.error("deleteQuestion failed", error);
    return { ok: false, error: "Could not delete the question." };
  }
}

/** A teacher marks a chapter as covered, so the batch knows what to read. */
export async function markChapterCovered(input: {
  chapterId: string;
  batchId: string;
  covered: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("attendance.mark");

  try {
    if (input.covered) {
      await prisma.chapterCovered.upsert({
        where: {
          chapterId_batchId: { chapterId: input.chapterId, batchId: input.batchId },
        },
        create: { chapterId: input.chapterId, batchId: input.batchId },
        update: {},
      });
    } else {
      await prisma.chapterCovered.deleteMany({
        where: { chapterId: input.chapterId, batchId: input.batchId },
      });
    }
    await logActivity(admin.id, "chapter-covered", "chapter", input.chapterId);
    revalidatePath("/admin/course-book");
    return { ok: true };
  } catch (error) {
    console.error("markChapterCovered failed", error);
    return { ok: false, error: "Could not save that." };
  }
}

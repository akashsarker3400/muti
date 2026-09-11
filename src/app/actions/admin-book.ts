"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requirePermission } from "@/lib/admin-auth";
import { slugify } from "@/lib/admin/slug";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";

/** Course book admin (addendum 5, A7): details, chapters, course links. */

const bookSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  subtitle: z.string().trim().optional().default(""),
  edition: z.string().trim().optional().default(""),
  slug: z.string().trim().optional().default(""),
  coverImage: z.string().trim().optional().default(""),
  description: z.string().optional().default(""),
  descriptionBn: z.string().optional().default(""),
  pages: z.coerce.number().int().min(0).optional().default(0),
  priceNote: z.string().trim().optional().default(""),
  sampleChapterTitle: z.string().trim().optional().default(""),
  published: z.boolean().default(false),
  courseIds: z.array(z.string()).optional().default([]),
});

const chapterSchema = z.object({
  id: z.string().optional(),
  number: z.coerce.number().int().min(1, "Number must be 1 or more"),
  title: z.string().trim().min(1, "Title is required"),
  titleBn: z.string().trim().optional().default(""),
  summary: z.string().trim().optional().default(""),
  topics: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .default([]),
  isSample: z.boolean().default(false),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function revalidate() {
  revalidatePath("/admin/course-book");
  revalidatePath("/", "layout");
}

export async function saveCourseBook(id: string, raw: unknown): Promise<SaveResult> {
  const admin = await requirePermission("book.manage");
  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  try {
    const book = await prisma.courseBook.findUnique({
      where: { id },
      include: { chapters: { select: { id: true } } },
    });
    if (!book) return { ok: false, error: "Book not found." };

    // Publishing needs the pieces the public page shows: at least one chapter
    // and the sample PDF for the lead form. The cover can follow.
    if (v.published && book.chapters.length === 0) {
      return { ok: false, errors: { published: "Add the chapters before publishing" } };
    }
    if (v.published && !book.samplePdfFileId) {
      return {
        ok: false,
        errors: { published: "Upload the sample chapter PDF before publishing" },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.courseBook.update({
        where: { id },
        data: {
          title: v.title,
          subtitle: v.subtitle || null,
          edition: v.edition || null,
          slug: slugify(v.slug || v.title),
          coverImage: v.coverImage || null,
          description: sanitizeRichText(v.description) || null,
          descriptionBn: sanitizeRichText(v.descriptionBn) || null,
          pages: v.pages || null,
          priceNote: v.priceNote || null,
          sampleChapterTitle: v.sampleChapterTitle || null,
          published: v.published,
        },
      });
      await tx.courseBookOnCourse.deleteMany({ where: { bookId: id } });
      if (v.courseIds.length > 0) {
        await tx.courseBookOnCourse.createMany({
          data: v.courseIds.map((courseId) => ({ bookId: id, courseId })),
          skipDuplicates: true,
        });
      }
    });
    await logActivity(admin.id, "update", "CourseBook", id);
    revalidate();
    return { ok: true, id };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { ok: false, errors: { slug: "This slug is already in use" } };
    }
    console.error("saveCourseBook failed", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
}

export async function saveChapter(bookId: string, raw: unknown): Promise<SaveResult> {
  const admin = await requirePermission("book.manage");
  const parsed = chapterSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const topics = (Array.isArray(v.topics) ? v.topics : v.topics.split(","))
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 8);

  try {
    const data = {
      number: v.number,
      title: v.title,
      titleBn: v.titleBn || null,
      summary: v.summary || null,
      topics,
      isSample: v.isSample,
    };
    const row = v.id
      ? await prisma.courseBookChapter.update({ where: { id: v.id, bookId }, data })
      : await prisma.courseBookChapter.create({
          data: { ...data, bookId, sortOrder: v.number * 10 },
        });
    await logActivity(
      admin.id,
      v.id ? "update" : "create",
      "CourseBookChapter",
      row.id,
    );
    revalidate();
    return { ok: true, id: row.id };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        ok: false,
        errors: { number: "Another chapter already has this number" },
      };
    }
    console.error("saveChapter failed", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
}

export async function deleteChapter(bookId: string, id: string): Promise<SaveResult> {
  const admin = await requirePermission("book.manage");
  try {
    await prisma.courseBookChapter.delete({ where: { id, bookId } });
    await logActivity(admin.id, "delete", "CourseBookChapter", id);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete." };
  }
}

export async function reorderChapters(
  bookId: string,
  ids: string[],
): Promise<SaveResult> {
  const admin = await requirePermission("book.manage");
  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.courseBookChapter.update({
          where: { id, bookId },
          data: { sortOrder: (index + 1) * 10 },
        }),
      ),
    );
    await logActivity(admin.id, "reorder", "CourseBookChapter", null);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "The order could not be saved." };
  }
}

export async function removeSamplePdf(bookId: string): Promise<SaveResult> {
  const admin = await requirePermission("book.manage");
  try {
    const book = await prisma.courseBook.findUnique({ where: { id: bookId } });
    if (!book?.samplePdfFileId) return { ok: true };
    const media = await prisma.media.findUnique({
      where: { id: book.samplePdfFileId },
    });
    // Without a sample the lead form has nothing to give, so unpublish too.
    await prisma.courseBook.update({
      where: { id: bookId },
      data: { samplePdfFileId: null, published: false },
    });
    if (media) {
      const { storage } = await import("@/lib/storage");
      await storage()
        .delete(media.key)
        .catch(() => undefined);
      await prisma.media.delete({ where: { id: media.id } }).catch(() => undefined);
    }
    await logActivity(admin.id, "delete", "CourseBook", bookId);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not remove the file." };
  }
}

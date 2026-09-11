"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import type { RoutineType } from "@/generated/prisma/enums";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/admin/resources";
import { prisma } from "@/lib/prisma";

/** Course CRUD, routine editing and reordering (section 7.3). */

export type RoutineRow = {
  id?: string;
  semester: string;
  label: string;
  title: string;
  type: RoutineType;
};

const courseSchema = z.object({
  code: z.string().trim().min(1, "কোড আবশ্যক"),
  slug: z.string().trim().default(""),
  nameEn: z.string().trim().min(1, "নাম (English) আবশ্যক"),
  nameBn: z.string().trim().min(1, "নাম (বাংলা) আবশ্যক"),
  fullNameEn: z.string().trim().min(1, "পূর্ণ নাম (English) আবশ্যক"),
  fullNameBn: z.string().trim().min(1, "পূর্ণ নাম (বাংলা) আবশ্যক"),
  level: z.enum(["CERTIFICATE", "DIPLOMA", "SPECIAL"]),
  durationMonths: z.coerce.number().int().min(0).default(0),
  durationLabelEn: z.string().trim().default(""),
  durationLabelBn: z.string().trim().default(""),
  courseFee: z.coerce.number().int().min(0).default(0),
  examFee: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  formFee: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  bookFee: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  offerPrice: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  offerLabelEn: z.string().trim().default(""),
  offerLabelBn: z.string().trim().default(""),
  lectureClasses: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  practicalClasses: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  overviewEn: z.string().default(""),
  overviewBn: z.string().default(""),
  eligibilityEn: z.string().default(""),
  eligibilityBn: z.string().default(""),
  certificateNoteEn: z.string().trim().default(""),
  certificateNoteBn: z.string().trim().default(""),
  affiliationNote: z.string().trim().default(""),
  image: z.string().trim().default(""),
  admissionOpen: z.boolean().default(true),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  metaTitle: z.string().trim().default(""),
  metaDescription: z.string().trim().default(""),
});

function nullable(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function optionalInt(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export async function saveCourse(
  id: string | null,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const admin = await requireAdmin();

  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const input = parsed.data;

  const data = {
    code: input.code,
    slug: slugify(input.slug || input.nameEn),
    nameEn: input.nameEn,
    nameBn: input.nameBn,
    fullNameEn: input.fullNameEn,
    fullNameBn: input.fullNameBn,
    level: input.level,
    durationMonths: input.durationMonths,
    durationLabelEn: input.durationLabelEn,
    durationLabelBn: input.durationLabelBn,
    courseFee: input.courseFee,
    examFee: optionalInt(input.examFee),
    formFee: optionalInt(input.formFee),
    bookFee: optionalInt(input.bookFee),
    offerPrice: optionalInt(input.offerPrice),
    offerLabelEn: nullable(input.offerLabelEn),
    offerLabelBn: nullable(input.offerLabelBn),
    lectureClasses: optionalInt(input.lectureClasses),
    practicalClasses: optionalInt(input.practicalClasses),
    overviewEn: nullable(input.overviewEn),
    overviewBn: nullable(input.overviewBn),
    eligibilityEn: nullable(input.eligibilityEn),
    eligibilityBn: nullable(input.eligibilityBn),
    certificateNoteEn: nullable(input.certificateNoteEn),
    certificateNoteBn: nullable(input.certificateNoteBn),
    affiliationNote: nullable(input.affiliationNote),
    image: nullable(input.image),
    admissionOpen: input.admissionOpen,
    published: input.published,
    featured: input.featured,
    sortOrder: input.sortOrder,
    metaTitle: nullable(input.metaTitle),
    metaDescription: nullable(input.metaDescription),
  };

  try {
    const course = id
      ? await prisma.course.update({ where: { id }, data })
      : await prisma.course.create({ data });

    await logActivity(admin.id, id ? "update" : "create", "course", course.id);
    revalidatePath("/admin/courses");
    revalidatePath("/", "layout");

    return { ok: true, id: course.id };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/** Replaces the whole routine for a course in one transaction. */
export async function saveCourseRoutine(
  courseId: string,
  rows: RoutineRow[],
): Promise<SaveResult> {
  const admin = await requireAdmin();

  const clean = rows
    .filter((row) => row.label.trim() || row.title.trim())
    .map((row, index) => ({
      courseId,
      semester: row.semester.trim() || null,
      label: row.label.trim(),
      title: row.title.trim(),
      type: row.type,
      sortOrder: (index + 1) * 10,
    }));

  try {
    await prisma.$transaction([
      prisma.courseRoutine.deleteMany({ where: { courseId } }),
      ...(clean.length > 0 ? [prisma.courseRoutine.createMany({ data: clean })] : []),
    ]);

    await logActivity(admin.id, "routine", "course", courseId);
    revalidatePath("/admin/courses");
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function deleteCourse(id: string): Promise<SaveResult> {
  const admin = await requireAdmin();

  try {
    await prisma.course.delete({ where: { id } });
    await logActivity(admin.id, "delete", "course", id);
    revalidatePath("/admin/courses");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/** Copies a course and its routine as an unpublished draft (section 7.3). */
export async function duplicateCourse(id: string): Promise<SaveResult> {
  const admin = await requireAdmin();

  try {
    const source = await prisma.course.findUnique({
      where: { id },
      include: { routines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) return { ok: false, error: "কোর্সটি পাওয়া যায়নি।" };

    const suffix = Date.now().toString(36).slice(-4);
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      routines,
      ...rest
    } = source;

    const copy = await prisma.course.create({
      data: {
        ...rest,
        code: `${source.code}-COPY-${suffix}`,
        slug: `${source.slug}-copy-${suffix}`,
        nameEn: `${source.nameEn} (Copy)`,
        nameBn: `${source.nameBn} (কপি)`,
        // A copy always starts hidden so it cannot appear on the site by accident.
        published: false,
        featured: false,
        routines: {
          create: routines.map((routine) => ({
            semester: routine.semester,
            label: routine.label,
            title: routine.title,
            type: routine.type,
            sortOrder: routine.sortOrder,
          })),
        },
      },
    });

    await logActivity(admin.id, "duplicate", "course", copy.id);
    revalidatePath("/admin/courses");

    return { ok: true, id: copy.id };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/** Persists a new drag-and-drop order (section 7.3). */
export async function reorderCourses(ids: string[]): Promise<SaveResult> {
  const admin = await requireAdmin();

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.course.update({
          where: { id },
          data: { sortOrder: (index + 1) * 10 },
        }),
      ),
    );
    await logActivity(admin.id, "reorder", "course", null);
    revalidatePath("/admin/courses");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function setCourseFlag(
  id: string,
  field: "published" | "admissionOpen" | "featured",
  value: boolean,
): Promise<SaveResult> {
  const admin = await requireAdmin();

  try {
    await prisma.course.update({ where: { id }, data: { [field]: value } });
    await logActivity(admin.id, `${field}:${value}`, "course", id);
    revalidatePath("/admin/courses");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

function describe(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "P2002") {
    return "এই কোড বা slug ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি দিন।";
  }
  if (code === "P2003" || code === "P2014") {
    return "এই কোর্সের সাথে শিক্ষার্থী বা ব্যাচ যুক্ত আছে, তাই মুছে ফেলা যাবে না। আগে সেগুলো সরান বা কোর্সটি অপ্রকাশিত করুন।";
  }
  console.error("Course action failed", error);
  return "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
}

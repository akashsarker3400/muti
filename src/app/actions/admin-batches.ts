"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { revalidateBatches } from "@/lib/admin/seats";
import { prisma } from "@/lib/prisma";

/** Batch clone (addendum 2, A2). */

const cloneSchema = z.object({
  name: z.string().trim().min(1, "ব্যাচের নাম আবশ্যক"),
  startDate: z.string().trim().default(""),
  /**
   * An empty field means "keep the source batch's seat count". It has to be
   * turned into undefined *before* coercion, because `z.coerce.number()`
   * happily turns "" into 0.
   */
  seats: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(0).optional(),
  ),
});

export type CloneResult =
  | { ok: true; id: string }
  | { ok: false; error?: string; errors?: Record<string, string> };

export async function cloneBatch(
  sourceId: string,
  values: Record<string, unknown>,
): Promise<CloneResult> {
  const admin = await requireAdmin();

  const parsed = cloneSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  try {
    const source = await prisma.batch.findUnique({ where: { id: sourceId } });
    if (!source) return { ok: false, error: "ব্যাচটি পাওয়া যায়নি।" };

    const startDate = parsed.data.startDate
      ? new Date(`${parsed.data.startDate}T00:00:00.000Z`)
      : null;

    const seats = parsed.data.seats ?? source.seats;

    const copy = await prisma.batch.create({
      data: {
        courseId: source.courseId,
        name: parsed.data.name,
        startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
        // A clone is always a fresh intake: same schedule, empty seats.
        status: "UPCOMING",
        seats,
        seatsFilled: 0,
        seatsFilledManual: false,
        showSeatCounter: source.showSeatCounter,
        classDays: source.classDays,
        classTime: source.classTime,
        note: source.note,
        published: source.published,
      },
    });

    await logActivity(admin.id, "clone", "batch", copy.id);
    revalidatePath("/admin/batches");
    revalidateBatches();

    return { ok: true, id: copy.id };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return { ok: false, errors: { name: "এই নামে একটি ব্যাচ ইতিমধ্যে আছে।" } };
    }
    console.error("cloneBatch failed", error);
    return { ok: false, error: "ব্যাচ কপি করা যায়নি।" };
  }
}

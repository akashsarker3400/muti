"use server";

import { revalidatePath } from "next/cache";

import type { ApplicationStatus } from "@/generated/prisma/enums";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { bumpSeatsFilled } from "@/lib/admin/seats";
import { sendTemplate } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

/** Admin actions for the Applications inbox (section 7.2). */

const STATUSES: ApplicationStatus[] = ["NEW", "CONTACTED", "ADMITTED", "CLOSED"];

export async function setApplicationStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  if (!STATUSES.includes(status as ApplicationStatus)) {
    return { ok: false, error: "Unknown status." };
  }

  try {
    const before = await prisma.application.findUnique({
      where: { id },
      select: {
        status: true,
        batchId: true,
        name: true,
        phone: true,
        course: { select: { nameEn: true } },
        batch: { select: { name: true } },
      },
    });

    await prisma.application.update({
      where: { id },
      data: { status: status as ApplicationStatus },
    });

    // Admitting into a batch fills a seat; undoing an admission frees it
    // again (addendum 2, A1).
    if (before && before.status !== status) {
      if (status === "ADMITTED") await bumpSeatsFilled(before.batchId, 1);
      else if (before.status === "ADMITTED") {
        await bumpSeatsFilled(before.batchId, -1);
      }
    }

    // "Your seat is confirmed" is the one message an applicant is waiting for,
    // so it goes the moment the office marks the admission. Once only: the
    // dedupe key survives a status changed back and forth.
    if (before && before.status !== "ADMITTED" && status === "ADMITTED") {
      const settings = await getSiteSettings();
      await sendTemplate({
        key: "application-admitted",
        to: before.phone,
        values: {
          name: before.name,
          course: before.course?.nameEn ?? "",
          batch: before.batch?.name ?? "",
          phone: settings.contact.phone1,
          institute: settings.general.shortName || settings.general.nameEn,
        },
        entity: "application",
        entityId: id,
        dedupeKey: `application-admitted:${id}`,
        userId: admin.id,
      });
    }

    await logActivity(admin.id, `status:${status}`, "application", id);
    revalidatePath("/admin/applications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    console.error("setApplicationStatus failed", error);
    return { ok: false, error: "The change could not be saved." };
  }
}

export async function setApplicationNote(
  id: string,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  try {
    await prisma.application.update({
      where: { id },
      data: { adminNote: note.trim() || null },
    });
    await logActivity(admin.id, "note", "application", id);
    revalidatePath("/admin/applications");
    return { ok: true };
  } catch (error) {
    console.error("setApplicationNote failed", error);
    return { ok: false, error: "The note could not be saved." };
  }
}

/** Attaches (or clears) the applicant's photo from the detail dialog. */
export async function setApplicationPhoto(
  id: string,
  photo: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const value = photo.trim();
  if (value && !/^\/uploads\/[\w./-]+$/.test(value)) {
    return { ok: false, error: "Invalid file path." };
  }

  try {
    await prisma.application.update({
      where: { id },
      data: { photo: value || null },
    });
    await logActivity(admin.id, "photo", "application", id);
    revalidatePath("/admin/applications");
    return { ok: true };
  } catch (error) {
    console.error("setApplicationPhoto failed", error);
    return { ok: false, error: "The photo could not be saved." };
  }
}

export async function deleteApplication(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  try {
    // Soft delete (ERP addendum, 2.4): a lead the office deletes by accident
    // is a lost admission, so the row is hidden rather than removed.
    await prisma.application.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logActivity(admin.id, "delete", "application", id);
    revalidatePath("/admin/applications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    console.error("deleteApplication failed", error);
    return { ok: false, error: "Could not delete." };
  }
}

/** Bulk status change from the list's checkbox selection (section 7.2). */
export async function bulkSetStatus(
  ids: string[],
  status: string,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const admin = await requireAdmin();

  if (!STATUSES.includes(status as ApplicationStatus)) {
    return { ok: false, error: "Unknown status." };
  }
  if (ids.length === 0) return { ok: false, error: "No applications selected." };

  try {
    // Read the batches first so the seat counter only moves for applications
    // whose status actually changes (addendum 2, A1).
    const before = await prisma.application.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, batchId: true },
    });

    const result = await prisma.application.updateMany({
      where: { id: { in: ids } },
      data: { status: status as ApplicationStatus },
    });

    for (const application of before) {
      if (application.status === status) continue;
      if (status === "ADMITTED") await bumpSeatsFilled(application.batchId, 1);
      else if (application.status === "ADMITTED") {
        await bumpSeatsFilled(application.batchId, -1);
      }
    }

    await logActivity(admin.id, `bulk-status:${status}`, "application", null);
    revalidatePath("/admin/applications");
    revalidatePath("/admin");
    return { ok: true, count: result.count };
  } catch (error) {
    console.error("bulkSetStatus failed", error);
    return { ok: false, error: "The change could not be saved." };
  }
}

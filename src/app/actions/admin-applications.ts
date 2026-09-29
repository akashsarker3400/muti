"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import {
  applicationEditSchema,
  diffApplication,
  EDIT_ERROR_TEXT,
  toApplicationValues,
  type ApplicationEditInput,
} from "@/lib/admin/application-edit";
import { bumpSeatsFilled } from "@/lib/admin/seats";
import { sendTemplate } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { fieldErrors } from "@/lib/validation";
import { normalizeBmdc } from "@/lib/verify";

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

/**
 * Super admin correction of an application after it was sent (a typo in the
 * name, a wrong number, the wrong course). Every save writes the old and new
 * value of each changed field to the activity log, so a correction can be
 * traced back. When the applicant is already a student, `syncStudent` copies
 * the corrected personal fields to that record too: only the fields changed
 * in this save, so a correction made on the student record is not undone.
 * Course and batch are not copied, because a student's course carries a roll
 * number and a fee plan.
 */
export async function updateApplication(
  id: string,
  input: ApplicationEditInput,
  options: { syncStudent?: boolean } = {},
): Promise<{
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  changed?: number;
  studentUpdated?: boolean;
}> {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a super admin can edit an application." };
  }

  const parsed = applicationEditSchema.safeParse(input);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    for (const key of Object.keys(errors)) {
      errors[key] = EDIT_ERROR_TEXT[errors[key]!] ?? errors[key]!;
    }
    return {
      ok: false,
      error: "Please correct the marked fields.",
      fieldErrors: errors,
    };
  }
  const values = toApplicationValues(parsed.data);

  try {
    const before = await prisma.application.findUnique({
      where: { id },
      include: { student: { select: { id: true } } },
    });
    if (!before) return { ok: false, error: "Application not found." };

    if (values.batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: values.batchId },
        select: { courseId: true },
      });
      if (!batch || batch.courseId !== values.courseId) {
        return {
          ok: false,
          error: "That batch belongs to a different course.",
          fieldErrors: { batchId: "Choose a batch of the selected course." },
        };
      }
    }

    const changes = diffApplication(before, values);
    if (Object.keys(changes).length === 0) return { ok: true, changed: 0 };

    await prisma.application.update({
      where: { id },
      data: { ...values, education: values.education ?? Prisma.DbNull },
    });

    // An admitted applicant holds a seat in their batch; moving them moves it.
    if (before.status === "ADMITTED" && before.batchId !== values.batchId) {
      await bumpSeatsFilled(before.batchId, -1);
      await bumpSeatsFilled(values.batchId, 1);
    }

    let studentUpdated = false;
    if (options.syncStudent && before.student) {
      const studentData: Record<string, unknown> = {};
      const copy: Array<[keyof typeof values, string]> = [
        ["name", "name"],
        ["phone", "phone"],
        ["email", "email"],
        ["dateOfBirth", "dateOfBirth"],
        ["fatherName", "fatherName"],
        ["motherName", "motherName"],
        ["nationalId", "nid"],
        ["bloodGroup", "bloodGroup"],
        ["presentAddress", "address"],
      ];
      for (const [from, to] of copy) {
        if (from in changes) studentData[to] = values[from];
      }
      if ("bmdc" in changes) {
        studentData.bmdc = values.bmdc;
        studentData.bmdcNormalized = values.bmdc ? normalizeBmdc(values.bmdc) : null;
      }
      if (Object.keys(studentData).length > 0) {
        await prisma.student.update({
          where: { id: before.student.id },
          data: studentData,
        });
        await logActivity(
          admin.id,
          "edit-from-application",
          "student",
          before.student.id,
          studentData as Prisma.InputJsonValue,
        );
        studentUpdated = true;
      }
    }

    await logActivity(admin.id, "edit", "application", id, changes);
    revalidatePath("/admin/applications");
    revalidatePath(`/admin/applications/${id}/edit`);
    if (studentUpdated) revalidatePath("/admin/students");
    return { ok: true, changed: Object.keys(changes).length, studentUpdated };
  } catch (error) {
    console.error("updateApplication failed", error);
    return { ok: false, error: "The changes could not be saved." };
  }
}

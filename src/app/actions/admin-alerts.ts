"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { teacherDues } from "@/lib/teacher-pay";

/** Alerts (addendum 2, B6) and teacher payments (B7). */

export async function resolveAlert(
  id: string,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("alerts.manage");
  try {
    await prisma.alert.update({
      where: { id },
      data: {
        status: "RESOLVED",
        note: note.trim() || null,
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
    });
    await logActivity(admin.id, "alert-resolve", "alert", id);
    revalidatePath("/admin/alerts");
    return { ok: true };
  } catch (error) {
    console.error("resolveAlert failed", error);
    return { ok: false, error: "Could not close the alert." };
  }
}

/** Sets what a teacher is paid per class from a date onwards. */
export async function saveTeacherRate(input: {
  facultyId: string;
  type: "LECTURE" | "PRACTICAL" | "EXAM" | "REVIEW";
  ratePerClass: number;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("teachers.pay");
  const rate = Math.round(input.ratePerClass);
  if (!Number.isFinite(rate) || rate < 0) {
    return { ok: false, error: "The rate must be a whole number of Taka." };
  }

  try {
    // A new row rather than an edit: the old rate still explains what was
    // paid last month, and a payment already made must keep its arithmetic.
    await prisma.teacherRate.create({
      data: { facultyId: input.facultyId, type: input.type, ratePerClass: rate },
    });
    await logActivity(admin.id, "teacher-rate", "faculty", input.facultyId);
    revalidatePath("/admin/teacher-pay");
    return { ok: true };
  } catch (error) {
    console.error("saveTeacherRate failed", error);
    return { ok: false, error: "Could not save the rate." };
  }
}

/** Records that a teacher was paid for a period. */
export async function payTeacher(input: {
  facultyId: string;
  from: string;
  to: string;
  method?: string;
  reference?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("teachers.pay");

  const from = new Date(`${input.from}T00:00:00.000Z`);
  const to = new Date(`${input.to}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: false, error: "Those dates could not be read." };
  }

  const dues = await teacherDues(from, to);
  const due = dues.find((entry) => entry.facultyId === input.facultyId);
  if (!due || due.sessions === 0) {
    return { ok: false, error: "This teacher took no classes in that period." };
  }
  if (due.missingRate) {
    return {
      ok: false,
      error: "Some of these classes have no rate set, so the total would be short.",
    };
  }

  try {
    await prisma.teacherPayment.create({
      data: {
        facultyId: input.facultyId,
        periodFrom: from,
        periodTo: to,
        sessionsCount: due.sessions,
        amount: due.amount,
        paidAt: new Date(),
        method: (input.method as "CASH") || "CASH",
        reference: input.reference?.trim() || null,
        createdById: admin.id,
      },
    });
    await logActivity(admin.id, "teacher-payment", "faculty", input.facultyId);
    revalidatePath("/admin/teacher-pay");
    return { ok: true };
  } catch (error) {
    console.error("payTeacher failed", error);
    return { ok: false, error: "Could not record the payment." };
  }
}

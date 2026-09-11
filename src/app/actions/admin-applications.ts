"use server";

import { revalidatePath } from "next/cache";

import type { ApplicationStatus } from "@/generated/prisma/enums";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { bumpSeatsFilled } from "@/lib/admin/seats";
import { prisma } from "@/lib/prisma";

/** Admin actions for the Applications inbox (section 7.2). */

const STATUSES: ApplicationStatus[] = ["NEW", "CONTACTED", "ADMITTED", "CLOSED"];

export async function setApplicationStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  if (!STATUSES.includes(status as ApplicationStatus)) {
    return { ok: false, error: "অজানা অবস্থা।" };
  }

  try {
    const before = await prisma.application.findUnique({
      where: { id },
      select: { status: true, batchId: true },
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

    await logActivity(admin.id, `status:${status}`, "application", id);
    revalidatePath("/admin/applications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    console.error("setApplicationStatus failed", error);
    return { ok: false, error: "পরিবর্তন করা যায়নি।" };
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
    return { ok: false, error: "নোট সংরক্ষণ করা যায়নি।" };
  }
}

export async function deleteApplication(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  try {
    await prisma.application.delete({ where: { id } });
    await logActivity(admin.id, "delete", "application", id);
    revalidatePath("/admin/applications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    console.error("deleteApplication failed", error);
    return { ok: false, error: "মুছে ফেলা যায়নি।" };
  }
}

/** Bulk status change from the list's checkbox selection (section 7.2). */
export async function bulkSetStatus(
  ids: string[],
  status: string,
): Promise<{ ok: boolean; error?: string; count?: number }> {
  const admin = await requireAdmin();

  if (!STATUSES.includes(status as ApplicationStatus)) {
    return { ok: false, error: "অজানা অবস্থা।" };
  }
  if (ids.length === 0) return { ok: false, error: "কোনো আবেদন বাছাই করা হয়নি।" };

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
    return { ok: false, error: "পরিবর্তন করা যায়নি।" };
  }
}

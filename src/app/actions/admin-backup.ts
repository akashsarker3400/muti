"use server";

import { revalidatePath } from "next/cache";

import { createBackup } from "@/lib/backup";
import { logActivity, requireSuperAdmin } from "@/lib/admin-auth";

/**
 * "Back up now" (addendum 2, A6). Super admin only: the dump contains every
 * student, application and patient record the institute holds.
 */
export async function runBackupNow(): Promise<{
  ok: boolean;
  error?: string;
  size?: number;
}> {
  const admin = await requireSuperAdmin();

  const result = await createBackup();
  await logActivity(
    admin.id,
    result.ok ? "backup" : "backup-failed",
    "backup",
    result.ok ? result.key : null,
  );
  revalidatePath("/admin/backups");

  return result.ok
    ? { ok: true, size: result.size }
    : { ok: false, error: result.error };
}

"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isSafeKey, storage } from "@/lib/storage";

/** Deletes one file from the uploads volume (section 7.13). */
export async function deleteMediaFile(
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  if (!url.startsWith("/uploads/")) {
    return { ok: false, error: "Only uploaded files can be deleted." };
  }

  const key = url.slice("/uploads/".length);
  if (!isSafeKey(key)) {
    return { ok: false, error: "Invalid file name." };
  }
  // Protected files (the course book sample) and recorded uploads (videos,
  // posters) are removed from their own admin pages, never from here.
  const row = await prisma.media.findUnique({ where: { key } });
  if (row?.protected || key.startsWith("protected/")) {
    return {
      ok: false,
      error: "This file is protected. Remove it from the Course book page.",
    };
  }
  if (row) {
    return {
      ok: false,
      error: "This file belongs to a video. Delete the video instead.",
    };
  }

  try {
    await storage().delete(key);
    await logActivity(admin.id, "delete-media", "Media", url);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    console.error("deleteMediaFile failed", error);
    return { ok: false, error: "The file could not be deleted." };
  }
}

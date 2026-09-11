"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";

import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { uploadDir } from "@/lib/env";

/** Deletes one file from the uploads volume (section 7.13). */
export async function deleteMediaFile(
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  if (!url.startsWith("/uploads/")) {
    return { ok: false, error: "শুধু আপলোড করা ফাইল মোছা যাবে।" };
  }

  const relative = url.slice("/uploads/".length);
  const segments = relative.split("/");

  // Reject traversal before touching the filesystem (section 11).
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment || segment === "." || segment === ".." || segment.includes("\0"),
    )
  ) {
    return { ok: false, error: "ফাইলের নাম সঠিক নয়।" };
  }

  const root = path.resolve(uploadDir);
  const target = path.resolve(root, ...segments);
  if (!target.startsWith(root + path.sep)) {
    return { ok: false, error: "ফাইলের নাম সঠিক নয়।" };
  }

  try {
    await unlink(target);
    await logActivity(admin.id, "delete-media", "Media", url);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    console.error("deleteMediaFile failed", error);
    return { ok: false, error: "ফাইলটি মুছে ফেলা যায়নি।" };
  }
}

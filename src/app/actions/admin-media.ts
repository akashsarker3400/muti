"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { isSafeKey, storage } from "@/lib/storage";

/** Deletes one file from the uploads volume (section 7.13). */
export async function deleteMediaFile(
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  if (!url.startsWith("/uploads/")) {
    return { ok: false, error: "শুধু আপলোড করা ফাইল মোছা যাবে।" };
  }

  const key = url.slice("/uploads/".length);
  if (!isSafeKey(key)) {
    return { ok: false, error: "ফাইলের নাম সঠিক নয়।" };
  }

  try {
    await storage().delete(key);
    await logActivity(admin.id, "delete-media", "Media", url);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    console.error("deleteMediaFile failed", error);
    return { ok: false, error: "ফাইলটি মুছে ফেলা যায়নি।" };
  }
}

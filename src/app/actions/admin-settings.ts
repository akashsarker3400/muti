"use server";

import { revalidatePath } from "next/cache";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { formToSettings } from "@/lib/admin/settings-form";
import { prisma } from "@/lib/prisma";
import { siteSettingsSchema } from "@/lib/site-settings-schema";

/** Saves the single Site Settings row (section 7.11). */
export async function saveSiteSettings(
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const admin = await requireAdmin();

  const parsed = siteSettingsSchema.safeParse(formToSettings(values));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      // Map "contact.phone1" back onto the flat field name the form uses.
      const key = issue.path.join(".");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return {
      ok: false,
      errors,
      error:
        Object.keys(errors).length === 0 ? "সেটিংস সংরক্ষণ করা যায়নি।" : undefined,
    };
  }

  try {
    await prisma.siteSetting.upsert({
      where: { id: 1 },
      update: { json: parsed.data },
      create: { id: 1, json: parsed.data },
    });

    await logActivity(admin.id, "update", "siteSetting", "1");

    // Site Settings feeds the header, footer and every page's metadata.
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");

    return { ok: true };
  } catch (error) {
    console.error("saveSiteSettings failed", error);
    return { ok: false, error: "সেটিংস সংরক্ষণ করা যায়নি।" };
  }
}

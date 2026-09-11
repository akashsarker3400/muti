"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { LeadSource } from "@/generated/prisma/enums";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/** Lead source editing and office-created applications (addendum 2, A3). */

const SOURCES: LeadSource[] = [
  "FACEBOOK",
  "GOOGLE",
  "REFERRAL",
  "WALK_IN",
  "WEBSITE",
  "OTHER",
];

export async function setApplicationSource(
  id: string,
  source: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  const value = source ? (source as LeadSource) : null;
  if (value && !SOURCES.includes(value)) {
    return { ok: false, error: "অজানা সোর্স।" };
  }

  try {
    await prisma.application.update({ where: { id }, data: { source: value } });
    await logActivity(admin.id, `source:${value ?? "none"}`, "application", id);
    revalidatePath("/admin/applications");
    return { ok: true };
  } catch (error) {
    console.error("setApplicationSource failed", error);
    return { ok: false, error: "পরিবর্তন করা যায়নি।" };
  }
}

const officeApplicationSchema = z.object({
  name: z.string().trim().min(2, "নাম আবশ্যক"),
  phone: z.string().trim().min(1, "মোবাইল নম্বর আবশ্যক"),
  courseId: z.string().trim().default(""),
  batchId: z.string().trim().default(""),
  qualification: z.string().trim().default(""),
  message: z.string().trim().default(""),
  source: z.string().trim().default("WALK_IN"),
});

/**
 * An enquiry taken at the desk or over the phone. It defaults to WALK_IN so
 * the lead reports separate office footfall from online campaigns.
 */
export async function createOfficeApplication(
  values: Record<string, unknown>,
): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  errors?: Record<string, string>;
}> {
  const admin = await requireAdmin();

  const parsed = officeApplicationSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return {
      ok: false,
      errors: { phone: "সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন" },
    };
  }

  const source = SOURCES.includes(parsed.data.source as LeadSource)
    ? (parsed.data.source as LeadSource)
    : "WALK_IN";

  try {
    const application = await prisma.application.create({
      data: {
        type: "ADMISSION",
        name: parsed.data.name,
        phone,
        courseId: parsed.data.courseId || null,
        batchId: parsed.data.batchId || null,
        qualification: parsed.data.qualification || null,
        message: parsed.data.message || null,
        source,
      },
    });

    await logActivity(admin.id, "create", "application", application.id);
    revalidatePath("/admin/applications");
    revalidatePath("/admin");

    return { ok: true, id: application.id };
  } catch (error) {
    console.error("createOfficeApplication failed", error);
    return { ok: false, error: "আবেদনটি সংরক্ষণ করা যায়নি।" };
  }
}

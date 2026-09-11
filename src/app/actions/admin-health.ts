"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { dhakaDateKey } from "@/lib/health";
import { prisma } from "@/lib/prisma";

/** Admin side of the free health service (addendum 4, §4). */

const STATUSES = ["REQUESTED", "CONFIRMED", "SEEN", "CANCELLED"] as const;

export async function setHealthAppointmentStatus(
  id: string,
  status: (typeof STATUSES)[number],
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("health.appointments");
  if (!STATUSES.includes(status)) return { ok: false, error: "ভুল অবস্থা।" };
  try {
    await prisma.healthAppointment.update({
      where: { id },
      data: { status, ...(note !== undefined ? { note: note.trim() || null } : {}) },
    });
    await logActivity(admin.id, "status", "healthAppointment", id);
    revalidatePath("/admin/health");
    return { ok: true };
  } catch (error) {
    console.error("setHealthAppointmentStatus failed", error);
    return { ok: false, error: "পরিবর্তন করা যায়নি।" };
  }
}

const countSchema = z.object({
  date: z.string().regex(/^\d{8}$/),
  patients: z.coerce.number().int().min(0).max(1000),
  reports: z.coerce.number().int().min(0).max(1000),
  consultations: z.coerce.number().int().min(0).max(1000),
});

/** "Patients seen today" quick entry — one row per day, overwritten on re-entry. */
export async function saveHealthDailyCount(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("health.appointments");
  const parsed = countSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "সংখ্যা ০ থেকে ১০০০ এর মধ্যে দিন।" };
  const { date, patients, reports, consultations } = parsed.data;
  try {
    await prisma.healthDailyCount.upsert({
      where: { date },
      create: { date, patients, reports, consultations },
      update: { patients, reports, consultations },
    });
    await logActivity(admin.id, "count", "healthDailyCount", date);
    revalidatePath("/admin/health");
    revalidatePath("/health-service");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("saveHealthDailyCount failed", error);
    return { ok: false, error: "সংরক্ষণ করা যায়নি।" };
  }
}

/** Serial taken at the desk or over the phone, so the day's list is complete. */
export async function createHealthAppointmentAtDesk(raw: {
  name: string;
  phone: string;
  age?: string;
  area?: string;
  complaint?: string;
}): Promise<{ ok: boolean; serialNo?: number; error?: string }> {
  const admin = await requirePermission("health.appointments");
  const { normalizePhone } = await import("@/lib/phone");
  const { nextSerial } = await import("@/lib/health");
  const name = raw.name.trim();
  const phone = normalizePhone(raw.phone);
  if (name.length < 2) return { ok: false, error: "নাম আবশ্যক।" };
  if (!phone) return { ok: false, error: "সঠিক মোবাইল নম্বর দিন।" };
  const age = raw.age?.trim() ? Number(raw.age) : null;
  const serialDate = dhakaDateKey();
  const serialNo = await nextSerial(serialDate);
  const row = await prisma.healthAppointment.create({
    data: {
      serialDate,
      serialNo,
      name,
      phone,
      age: age !== null && Number.isFinite(age) ? age : null,
      area: raw.area?.trim() || null,
      complaint: raw.complaint?.trim() || null,
      status: "CONFIRMED",
      referredBy: "office",
    },
  });
  await logActivity(admin.id, "create", "healthAppointment", row.id);
  revalidatePath("/admin/health");
  return { ok: true, serialNo };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { formatDate, toBanglaDigits } from "@/lib/format";
import { dhakaDateKey } from "@/lib/health";
import { sendTemplate } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

/** Admin side of the free health service (addendum 4, §4). */

const STATUSES = ["REQUESTED", "CONFIRMED", "SEEN", "CANCELLED"] as const;

export async function setHealthAppointmentStatus(
  id: string,
  status: (typeof STATUSES)[number],
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("health.appointments");
  if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status." };
  try {
    const row = await prisma.healthAppointment.update({
      where: { id },
      data: { status, ...(note !== undefined ? { note: note.trim() || null } : {}) },
      select: {
        id: true,
        name: true,
        phone: true,
        serialNo: true,
        serialDate: true,
        preferredDate: true,
      },
    });
    await logActivity(admin.id, "status", "healthAppointment", id);

    // Confirming a serial is the moment the patient needs to be told the
    // number and the day. Never the complaint: this is health data on
    // somebody's lock screen (addendum 4, §5).
    if (status === "CONFIRMED") await notifySerial(row, admin.id);
    revalidatePath("/admin/health");
    return { ok: true };
  } catch (error) {
    console.error("setHealthAppointmentStatus failed", error);
    return { ok: false, error: "The change could not be saved." };
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
  if (!parsed.success)
    return { ok: false, error: "Enter a number between 0 and 1000." };
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
    return { ok: false, error: "Could not save." };
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
  if (name.length < 2) return { ok: false, error: "Name is required." };
  if (!phone) return { ok: false, error: "Enter a valid mobile number." };
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
  await notifySerial(row, admin.id);
  revalidatePath("/admin/health");
  return { ok: true, serialNo };
}

/** The "your serial is N" message, sent once per appointment. */
async function notifySerial(
  row: {
    id: string;
    name: string;
    phone: string;
    serialNo: number;
    serialDate: string;
    preferredDate?: Date | null;
  },
  userId: string,
): Promise<void> {
  const settings = await getSiteSettings();
  const day =
    row.preferredDate ??
    new Date(
      `${row.serialDate.slice(0, 4)}-${row.serialDate.slice(4, 6)}-${row.serialDate.slice(6, 8)}T00:00:00.000Z`,
    );

  await sendTemplate({
    key: "appointment-confirmed",
    to: row.phone,
    values: {
      name: row.name,
      serial: toBanglaDigits(row.serialNo),
      date: formatDate(day, "bn"),
      institute: settings.general.shortName || settings.general.nameEn,
    },
    entity: "appointment",
    entityId: row.id,
    dedupeKey: `appointment-confirmed:${row.id}`,
    userId,
  });
}

"use server";

import { z } from "zod";

import { dhakaDateKey, nextSerial } from "@/lib/health";
import { notificationRecipients, sendMail } from "@/lib/mail";
import { displayPhone, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { siteUrl } from "@/lib/env";
import { verifyTurnstile } from "@/lib/turnstile";
import { latinDigits } from "@/lib/verify";

/**
 * Patient serial request for the free health service (addendum 4, §3). The
 * form is deliberately small; the phone is normalised, the serial number is
 * allocated atomically per day, and the office is emailed. Nothing here is
 * ever shown publicly except the serial number back to the person who asked.
 */

export type SerialResult =
  | { ok: true; serialNo: number; date: string }
  | { ok: false; errors?: Record<string, string>; error?: string };

const schema = z.object({
  name: z.string().trim().min(2, "nameRequired").max(120),
  phone: z.string().trim().min(1, "phoneRequired"),
  age: z.string().trim().max(3).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  area: z.string().trim().max(160).optional(),
  complaint: z.string().trim().max(200).optional(),
  preferredDate: z.string().trim().max(10).optional(),
  referredBy: z.string().trim().max(120).optional(),
  turnstileToken: z.string().optional(),
  /** Honeypot. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function requestHealthSerial(raw: unknown): Promise<SerialResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const data = parsed.data;
  if (data.website) return { ok: true, serialNo: 0, date: dhakaDateKey() };

  const settings = await getSiteSettings();
  if (!settings.health.published) return { ok: false, error: "closed" };

  const limit = await checkRateLimit("health");
  if (!limit.allowed) return { ok: false, error: "rateLimited" };

  const human = await verifyTurnstile(
    data.turnstileToken,
    settings.security.turnstileSecretKey,
    await clientIp(),
  );
  if (!human) return { ok: false, error: "captcha" };

  const phone = normalizePhone(data.phone);
  if (!phone) return { ok: false, errors: { phone: "phoneInvalid" } };

  const age = data.age ? Number(latinDigits(data.age)) : null;
  if (age !== null && (!Number.isFinite(age) || age < 0 || age > 120)) {
    return { ok: false, errors: { age: "ageInvalid" } };
  }

  let preferredDate: Date | null = null;
  if (data.preferredDate) {
    const date = new Date(`${latinDigits(data.preferredDate)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      return { ok: false, errors: { preferredDate: "dateInvalid" } };
    preferredDate = date;
  }

  const serialDate = dhakaDateKey();
  const serialNo = await nextSerial(serialDate);

  await prisma.healthAppointment.create({
    data: {
      serialDate,
      serialNo,
      name: data.name,
      phone,
      age,
      gender: data.gender || null,
      area: data.area || null,
      complaint: data.complaint || null,
      preferredDate,
      referredBy: data.referredBy || null,
    },
  });

  try {
    await sendMail({
      to: notificationRecipients(settings.integrations.notifyEmails),
      subject: `Free health service serial #${serialNo}: ${data.name}`,
      text: [
        `Serial: ${serialNo} (${serialDate})`,
        `Name: ${data.name}`,
        `Phone: ${displayPhone(phone)}`,
        `Age / gender: ${age ?? "—"} / ${data.gender || "—"}`,
        `Area: ${data.area || "—"}`,
        `Complaint: ${data.complaint || "—"}`,
        `Preferred date: ${data.preferredDate || "—"}`,
        `Referred by: ${data.referredBy || "—"}`,
        "",
        `${siteUrl}/admin/health`,
      ].join("\n"),
    });
  } catch (error) {
    // The serial is already saved; a mail failure must not undo it.
    console.error("health serial notification failed", error);
  }

  return { ok: true, serialNo, date: serialDate };
}

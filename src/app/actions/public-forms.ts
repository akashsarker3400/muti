"use server";

import { headers } from "next/headers";

import type { ApplicationType } from "@/generated/prisma/enums";
import { displayPhone, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { notificationRecipients, sendMail } from "@/lib/mail";
import { getSiteSettings } from "@/lib/site-settings";
import { siteUrl } from "@/lib/env";
import {
  admissionApplicationSchema,
  contactSchema,
  fieldErrors,
  freeClassSchema,
} from "@/lib/validation";

/**
 * Server actions behind the public forms (sections 5.6, 5.7, 5.16).
 * Every one of them: validates with zod, rejects honeypot hits, applies the
 * per-IP rate limit, saves an `Application` row, then tries to email the
 * office. A failed email never fails the submission.
 */

export type FormResult =
  { ok: true } | { ok: false; errors?: Record<string, string>; error?: string };

const QUALIFICATION_LABELS: Record<string, string> = {
  MBBS: "MBBS",
  INTERN: "Intern doctor",
  OTHER: "Other",
};

export async function submitAdmissionApplication(raw: unknown): Promise<FormResult> {
  const parsed = admissionApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  // A filled honeypot is a bot: accept silently so it does not retry.
  if (data.website) return { ok: true };

  const limit = await checkRateLimit("application");
  if (!limit.allowed) {
    return { ok: false, error: "rateLimited" };
  }

  const course = await prisma.course.findFirst({
    where: { id: data.courseId, published: true },
  });
  if (!course) {
    return { ok: false, errors: { courseId: "courseRequired" } };
  }

  const batch = data.batchId
    ? await prisma.batch.findFirst({
        where: { id: data.batchId, published: true },
      })
    : null;

  const phone = normalizePhone(data.phone)!;
  const whatsapp = data.whatsapp ? normalizePhone(data.whatsapp) : null;

  const application = await prisma.application.create({
    data: {
      type: "ADMISSION",
      name: data.name,
      phone,
      whatsapp,
      email: data.email || null,
      courseId: course.id,
      batchId: batch?.id ?? null,
      qualification: QUALIFICATION_LABELS[data.qualification],
      bmdc: data.bmdc || null,
      location: data.location || null,
      message: data.message || null,
      source: await requestSource(),
    },
  });

  await notifyOffice({
    type: "ADMISSION",
    subject: `New admission application: ${data.name} — ${course.nameEn}`,
    lines: [
      ["Name", data.name],
      ["Phone", displayPhone(phone)],
      ["WhatsApp", whatsapp ? displayPhone(whatsapp) : "—"],
      ["Email", data.email || "—"],
      ["Course", `${course.nameEn} (${course.code})`],
      ["Batch", batch?.name ?? "—"],
      ["Qualification", QUALIFICATION_LABELS[data.qualification]],
      ["BMDC", data.bmdc || "—"],
      ["Location", data.location || "—"],
      ["Message", data.message || "—"],
      ["Source", application.source ?? "—"],
    ],
    replyTo: data.email || undefined,
  });

  return { ok: true };
}

export async function submitFreeClass(raw: unknown): Promise<FormResult> {
  const parsed = freeClassSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  if (data.website) return { ok: true };

  const limit = await checkRateLimit("application");
  if (!limit.allowed) {
    return { ok: false, error: "rateLimited" };
  }

  const course = await prisma.course.findFirst({
    where: { id: data.courseId, published: true },
  });
  if (!course) {
    return { ok: false, errors: { courseId: "courseRequired" } };
  }

  const phone = normalizePhone(data.phone)!;
  const preferredDate = parseDate(data.preferredDate);

  await prisma.application.create({
    data: {
      type: "FREE_CLASS",
      name: data.name,
      phone,
      courseId: course.id,
      preferredDate,
      message: data.message || null,
      source: await requestSource(),
    },
  });

  await notifyOffice({
    type: "FREE_CLASS",
    subject: `Free class booking: ${data.name} — ${course.nameEn}`,
    lines: [
      ["Name", data.name],
      ["Phone", displayPhone(phone)],
      ["Course of interest", `${course.nameEn} (${course.code})`],
      ["Preferred date", preferredDate ? preferredDate.toDateString() : "—"],
      ["Message", data.message || "—"],
    ],
  });

  return { ok: true };
}

export async function submitContactMessage(raw: unknown): Promise<FormResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  if (data.website) return { ok: true };

  const limit = await checkRateLimit("application");
  if (!limit.allowed) {
    return { ok: false, error: "rateLimited" };
  }

  const phone = normalizePhone(data.phone)!;

  await prisma.application.create({
    data: {
      type: "CONTACT",
      name: data.name,
      phone,
      email: data.email || null,
      message: data.message,
      source: await requestSource(),
    },
  });

  await notifyOffice({
    type: "CONTACT",
    subject: `Website message from ${data.name}`,
    lines: [
      ["Name", data.name],
      ["Phone", displayPhone(phone)],
      ["Email", data.email || "—"],
      ["Message", data.message],
    ],
    replyTo: data.email || undefined,
  });

  return { ok: true };
}

/** Referrer plus any utm_* parameters, for the admin "source" column. */
async function requestSource(): Promise<string | null> {
  try {
    const headerList = await headers();
    const referer = headerList.get("referer");
    if (!referer) return null;

    const url = new URL(referer);
    const utm = [...url.searchParams.entries()]
      .filter(([key]) => key.startsWith("utm_"))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    return [url.hostname + url.pathname, utm].filter(Boolean).join(" ").slice(0, 300);
  } catch {
    return null;
  }
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function notifyOffice({
  type,
  subject,
  lines,
  replyTo,
}: {
  type: ApplicationType;
  subject: string;
  lines: Array<[string, string]>;
  replyTo?: string;
}) {
  const settings = await getSiteSettings();
  const to = notificationRecipients(settings.integrations.notifyEmails);

  const text = [
    ...lines.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open the admin panel: ${siteUrl}/admin/applications?type=${type}`,
  ].join("\n");

  const html = `
    <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">
      ${lines
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#5B6472">${escapeHtml(label)}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
        )
        .join("")}
    </table>
    <p style="font-family:system-ui,sans-serif;font-size:13px">
      <a href="${siteUrl}/admin/applications?type=${type}">Open in the admin panel</a>
    </p>
  `;

  await sendMail({ to, subject, text, html, replyTo });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

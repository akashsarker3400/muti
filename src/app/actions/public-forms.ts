"use server";

import { cookies, headers } from "next/headers";

import type { ApplicationType, LeadSource } from "@/generated/prisma/enums";
import {
  LEAD_COOKIE,
  parseLeadCookie,
  referralCodeOf,
  resolveLeadSource,
  type LeadData,
} from "@/lib/lead-source";
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

const EMPLOYMENT_LABELS: Record<string, string> = {
  GOVT: "Government",
  PRIVATE: "Private",
  OTHER: "Other",
};

/** "SSC 2010 · GPA 5.00 · Dhaka Board" per row, for the office email. */
function educationSummary(
  rows: Array<{ exam: string; year: string; gpa: string; board: string }> | undefined,
): string {
  if (!rows || rows.length === 0) return "—";
  return rows
    .map((row) =>
      [row.exam, row.year, row.gpa && `GPA ${row.gpa}`, row.board]
        .filter(Boolean)
        .join(" · "),
    )
    .join("\n");
}

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
  const lead = await leadAttribution();

  /**
   * A waitlist application is an ordinary enquiry with a marker the office can
   * see and filter on (addendum 2, A1).
   */
  const message = data.waitlist
    ? `[WAITLIST] ${data.message ?? ""}`.trim()
    : data.message || null;

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
      medicalCollege: data.medicalCollege || null,
      bmdc: data.bmdc || null,
      location: data.location || null,
      message,
      fatherName: data.fatherName || null,
      motherName: data.motherName || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      religion: data.religion || null,
      nationalId: data.nationalId || null,
      bloodGroup: data.bloodGroup || null,
      employment: data.employment || null,
      presentAddress: data.presentAddress || null,
      permanentAddress: data.permanentAddress || null,
      education:
        data.education && data.education.length > 0 ? data.education : undefined,
      source: lead.source,
      utm: lead.utm ?? undefined,
      referralCode: lead.referralCode,
    },
  });

  await notifyOffice({
    type: "ADMISSION",
    subject: `${data.waitlist ? "Waitlist" : "New admission"} application: ${data.name} — ${course.nameEn}`,
    lines: [
      ["Name", data.name],
      ["Phone", displayPhone(phone)],
      ["WhatsApp", whatsapp ? displayPhone(whatsapp) : "—"],
      ["Email", data.email || "—"],
      ["Course", `${course.nameEn} (${course.code})`],
      ["Batch", batch?.name ?? "—"],
      ["Father's name", data.fatherName || "—"],
      ["Mother's name", data.motherName || "—"],
      ["Date of birth", data.dateOfBirth || "—"],
      ["Religion", data.religion || "—"],
      ["Blood group", data.bloodGroup || "—"],
      ["Employment", data.employment ? EMPLOYMENT_LABELS[data.employment] : "—"],
      ["National ID", data.nationalId || "—"],
      ["Present address", data.presentAddress || "—"],
      ["Permanent address", data.permanentAddress || "—"],
      ["Qualification", QUALIFICATION_LABELS[data.qualification]],
      ["Medical college", data.medicalCollege || "—"],
      ["BMDC", data.bmdc || "—"],
      ["Education", educationSummary(data.education)],
      ["Location", data.location || "—"],
      ["Message", message || "—"],
      ["Source", application.source ?? "—"],
      ["Campaign", lead.utm?.utm_campaign ?? "—"],
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
  const lead = await leadAttribution();

  await prisma.application.create({
    data: {
      type: "FREE_CLASS",
      name: data.name,
      phone,
      courseId: course.id,
      preferredDate,
      message: data.message || null,
      source: lead.source,
      utm: lead.utm ?? undefined,
      referralCode: lead.referralCode,
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
  const lead = await leadAttribution();

  await prisma.application.create({
    data: {
      type: "CONTACT",
      name: data.name,
      phone,
      email: data.email || null,
      message: data.message,
      source: lead.source,
      utm: lead.utm ?? undefined,
      referralCode: lead.referralCode,
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

/**
 * Lead attribution for a submission (addendum 2, A3): the campaign cookie the
 * browser stored on the first visit, plus the referrer of this request as a
 * fallback for visitors who arrived untagged.
 */
async function leadAttribution(): Promise<{
  source: LeadSource;
  utm: LeadData | null;
  referralCode: string | null;
}> {
  let data: LeadData | null = null;

  try {
    const store = await cookies();
    data = parseLeadCookie(store.get(LEAD_COOKIE)?.value);
  } catch {
    // No cookie access — fall through to the referrer.
  }

  try {
    const referer = (await headers()).get("referer");
    if (referer) {
      const url = new URL(referer);
      if (!data) data = {};
      // Only record an external referrer; our own pages say nothing useful.
      data.referrer ??= url.origin.includes("localhost")
        ? undefined
        : `${url.hostname}${url.pathname}`.slice(0, 300);
    }
  } catch {
    // A malformed referer header is not worth failing a submission over.
  }

  return {
    source: resolveLeadSource(data),
    utm: data && Object.keys(data).length > 0 ? data : null,
    referralCode: referralCodeOf(data),
  };
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

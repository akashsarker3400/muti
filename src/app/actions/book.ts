"use server";

import { cookies, headers } from "next/headers";

import { signSampleToken } from "@/lib/book-token";
import { requiredEnv, siteUrl } from "@/lib/env";
import {
  LEAD_COOKIE,
  parseLeadCookie,
  referralCodeOf,
  resolveLeadSource,
  type LeadData,
} from "@/lib/lead-source";
import { notificationRecipients, sendMail } from "@/lib/mail";
import { displayPhone, normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site-settings";
import { verifyTurnstile } from "@/lib/turnstile";
import { bookSampleSchema, fieldErrors } from "@/lib/validation";

/**
 * Sample chapter lead capture (addendum 5, A4). Saves a BOOK_SAMPLE
 * application, hands back a signed 24-hour download token, emails the same
 * link when an address was given, and tells the office.
 */

export type BookSampleResult =
  | { ok: true; token: string; emailed: boolean }
  | { ok: false; errors?: Record<string, string>; error?: string };

const QUALIFICATION_LABELS: Record<string, string> = {
  MBBS: "MBBS",
  INTERN: "Intern doctor",
  OTHER: "Other",
};

export async function requestBookSample(
  slug: string,
  raw: unknown,
): Promise<BookSampleResult> {
  const parsed = bookSampleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.website) return { ok: true, token: "", emailed: false };

  const book = await prisma.courseBook.findFirst({
    where: { slug, published: true },
    include: { samplePdf: true },
  });
  if (!book?.samplePdf) return { ok: false, error: "unavailable" };

  const limit = await checkRateLimit("application");
  if (!limit.allowed) return { ok: false, error: "rateLimited" };

  const settings = await getSiteSettings();
  const human = await verifyTurnstile(
    data.turnstileToken,
    settings.security.turnstileSecretKey,
    await clientIp(),
  );
  if (!human) return { ok: false, error: "captcha" };

  const phone = normalizePhone(data.phone)!;
  const course = data.courseId
    ? await prisma.course.findFirst({ where: { id: data.courseId, published: true } })
    : null;
  const lead = await leadAttribution();

  const application = await prisma.application.create({
    data: {
      type: "BOOK_SAMPLE",
      name: data.name,
      phone,
      email: data.email || null,
      courseId: course?.id ?? null,
      qualification: QUALIFICATION_LABELS[data.qualification],
      message: `[BOOK SAMPLE] ${book.title}${book.sampleChapterTitle ? `: ${book.sampleChapterTitle}` : ""}${data.consent ? " · wants admission contact" : ""}`,
      source: lead.source,
      utm: lead.utm ?? undefined,
      referralCode: lead.referralCode,
    },
  });

  const token = signSampleToken(application.id, requiredEnv("AUTH_SECRET"));
  const link = `${siteUrl}/api/v1/book/sample?token=${encodeURIComponent(token)}`;

  let emailed = false;
  if (data.email) {
    const result = await sendMail({
      to: [data.email],
      subject: `Your free sample chapter: ${book.title}`,
      text: [
        `Hello ${data.name},`,
        "",
        `Here is your free sample chapter of "${book.title}"${book.sampleChapterTitle ? ` (${book.sampleChapterTitle})` : ""}.`,
        `Download (valid for 24 hours): ${link}`,
        "",
        "The full book is included with CMU and DMU admission at MUTI.",
        `${settings.general.nameEn} · ${settings.contact.phone1}`,
      ].join("\n"),
    });
    emailed = result.sent;
  }

  // Office notification: same shape as the other forms, so the inbox filters work.
  await sendMail({
    to: notificationRecipients(settings.integrations.notifyEmails),
    subject: `Sample chapter request: ${data.name}`,
    text: [
      `Name: ${data.name}`,
      `Phone: ${displayPhone(phone)}`,
      `Email: ${data.email || "none"}`,
      `Qualification: ${QUALIFICATION_LABELS[data.qualification]}`,
      `Interested course: ${course ? `${course.nameEn} (${course.code})` : "none"}`,
      `Wants admission contact: ${data.consent ? "yes" : "no"}`,
      `Source: ${application.source ?? "unknown"}`,
      "",
      `Open the admin panel: ${siteUrl}/admin/applications?type=BOOK_SAMPLE`,
    ].join("\n"),
    replyTo: data.email || undefined,
  }).catch(() => undefined);

  return { ok: true, token, emailed };
}

async function leadAttribution(): Promise<{
  source: ReturnType<typeof resolveLeadSource>;
  utm: LeadData | null;
  referralCode: string | null;
}> {
  let data: LeadData | null = null;
  try {
    const store = await cookies();
    data = parseLeadCookie(store.get(LEAD_COOKIE)?.value);
  } catch {
    // No cookie access.
  }
  try {
    const referer = (await headers()).get("referer");
    if (referer) {
      const url = new URL(referer);
      if (!data) data = {};
      data.referrer ??= url.origin.includes("localhost")
        ? undefined
        : `${url.hostname}${url.pathname}`.slice(0, 300);
    }
  } catch {
    // Malformed referer.
  }
  return {
    source: resolveLeadSource(data),
    utm: data && Object.keys(data).length > 0 ? data : null,
    referralCode: referralCodeOf(data),
  };
}

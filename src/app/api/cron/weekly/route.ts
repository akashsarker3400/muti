import { NextResponse } from "next/server";

import { notificationRecipients, sendMail } from "@/lib/mail";
import { buildWeeklySummary } from "@/lib/weekly-summary";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/**
 * The owner's Saturday summary (addendum 2, B9). Coolify:
 * `0 9 * * 6` with the same `CRON_SECRET` as the nightly job.
 *
 * Goes by email, and by SMS to the numbers in Site Settings if any are set.
 * The SMS is deliberately the short version: a week's figures do not fit in
 * 160 characters and nobody wants four texts.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const [settings, summary] = await Promise.all([
    getSiteSettings(),
    buildWeeklySummary(),
  ]);

  const to = notificationRecipients(settings.integrations.notifyEmails);
  const mail = to.length > 0 ? await sendMail({ to, subject: summary.subject, text: summary.body }) : { sent: false, reason: "no recipient" };

  return NextResponse.json({ ok: true, emailed: mail.sent, recipients: to.length });
}

export const GET = POST;

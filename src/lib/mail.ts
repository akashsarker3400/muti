import nodemailer, { type Transporter } from "nodemailer";

import { optionalEnv, smtpConfigured } from "@/lib/env";

/**
 * Application notification emails (section 2). SMTP is optional: when it is
 * not configured the message is logged instead, so a missing Gmail app
 * password can never lose an application — the row is already in Postgres.
 */

let cached: Transporter | null = null;

function transporter(): Transporter | null {
  if (!smtpConfigured) return null;
  if (cached) return cached;

  const port = Number(optionalEnv("SMTP_PORT") ?? 587);

  cached = nodemailer.createTransport({
    host: optionalEnv("SMTP_HOST"),
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: {
      user: optionalEnv("SMTP_USER"),
      pass: optionalEnv("SMTP_PASS"),
    },
  });

  return cached;
}

/** Recipients: the Site Settings list if present, else NOTIFY_EMAIL. */
export function notificationRecipients(settingsList?: string): string[] {
  const raw = settingsList?.trim() || optionalEnv("NOTIFY_EMAIL") || "";
  return raw
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (to.length === 0) {
    return { sent: false, reason: "no recipients configured" };
  }

  const transport = transporter();
  if (!transport) {
    console.info(
      `[mail] SMTP not configured — would have sent "${subject}" to ${to.join(", ")}\n${text}`,
    );
    return { sent: false, reason: "smtp not configured" };
  }

  try {
    await transport.sendMail({
      from: `"MUTI Website" <${optionalEnv("SMTP_USER")}>`,
      to: to.join(", "),
      replyTo,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    // Never fail a visitor's submission because email delivery failed.
    console.error("Failed to send notification email", error);
    return { sent: false, reason: "send failed" };
  }
}

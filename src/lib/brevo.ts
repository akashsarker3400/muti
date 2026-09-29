import "server-only";

import { optionalEnv } from "@/lib/env";

/**
 * Brevo transactional email over its HTTP API.
 *
 * Preferred over SMTP from inside a container: no long-lived connection to
 * keep alive, no port 25/587 egress to argue with the host about, and Brevo's
 * dashboard shows delivery, bounce and spam status per message, which is the
 * difference between "the email was sent" and "the applicant received it".
 *
 * `BREVO_API_KEY` switches it on. Without it `src/lib/mail.ts` falls back to
 * SMTP, and without that it logs, so a missing key never loses a submission.
 */

export const brevoConfigured = Boolean(optionalEnv("BREVO_API_KEY"));

export type BrevoMessage = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

/** The address every message is sent from; must be verified in Brevo. */
export function brevoSender(): { email: string; name: string } {
  return {
    email: optionalEnv("MAIL_FROM") ?? "no-reply@muti.ac.bd",
    name: optionalEnv("MAIL_FROM_NAME") ?? "MUTI",
  };
}

export async function sendViaBrevo(
  message: BrevoMessage,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = optionalEnv("BREVO_API_KEY");
  if (!apiKey) return { sent: false, reason: "brevo not configured" };

  try {
    // Ten seconds: a slow mail API must never hold a visitor's form open.
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: brevoSender(),
        to: message.to.map((email) => ({ email })),
        subject: message.subject,
        textContent: message.text,
        ...(message.html ? { htmlContent: message.html } : {}),
        ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) return { sent: true };

    // Brevo answers with a JSON body naming the problem (unverified sender,
    // bad key, quota). Log it: a silent failure here is the kind that is
    // noticed a month later by a student who never got their download link.
    const detail = await response.text();
    console.error(
      `Brevo rejected the message (${response.status}): ${detail.slice(0, 300)}`,
    );
    return { sent: false, reason: `brevo ${response.status}` };
  } catch (error) {
    console.error("Brevo request failed", error);
    return { sent: false, reason: "brevo unreachable" };
  }
}

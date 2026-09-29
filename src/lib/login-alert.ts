import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { siteUrl } from "@/lib/env";
import { sendMail } from "@/lib/mail";

/**
 * "Somebody signed in to your account" email.
 *
 * This is what email is genuinely good for in an authentication system. As a
 * second factor it is weak: the inbox is usually the same thing an attacker
 * takes over first, and the code has to survive delivery to be useful. As a
 * notification it is strong, because it catches the one case every other
 * control misses, namely a sign-in with entirely valid credentials. The
 * office does not have to do anything for it to work, and a message nobody
 * expected is a question somebody will ask.
 *
 * Only sent when the address differs from the last sign-in. An alert that
 * arrives twice a day for the same desk is an alert nobody reads, and the one
 * that matters would arrive into a folder people have learned to ignore.
 *
 * The address is compared as a SHA-256 stub, so the account carries no stored
 * history of where the office works from.
 *
 * Never blocks the sign-in: a mail failure is logged and swallowed.
 */
export function ipStub(ip: string): string {
  return createHash("sha256").update(`login-ip:${ip}`).digest("base64url").slice(0, 22);
}

export async function sendLoginAlert(
  user: { email: string; name: string },
  options: { knownStub: string | null },
): Promise<{ stub: string }> {
  const list = await headers();
  const ip =
    list.get("cf-connecting-ip") ??
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const stub = ipStub(ip);

  // Same place as last time: the sign-in is still audited, just not emailed.
  if (options.knownStub === stub) return { stub };

  try {
    const agent = list.get("user-agent") ?? "unknown device";
    const when = new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      dateStyle: "full",
      timeStyle: "short",
    });

    await sendMail({
      to: [user.email],
      subject: "New sign-in to the MUTI admin panel",
      text: [
        `Hello ${user.name},`,
        "",
        "Your MUTI admin account was just signed in to from an address it has",
        "not been used from before.",
        "",
        `Time:    ${when} (Dhaka)`,
        `Address: ${ip}`,
        `Browser: ${agent.slice(0, 160)}`,
        "",
        "If this was you, nothing to do.",
        "",
        "If it was not you, change your password now and turn on two-factor",
        `authentication: ${siteUrl}/admin/security`,
        "Then ask a super admin to check the Activity log.",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Could not send the sign-in alert", error);
  }
  return { stub };
}

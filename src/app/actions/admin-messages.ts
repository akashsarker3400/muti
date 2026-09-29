"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { DEFAULT_TEMPLATES, sendMessage } from "@/lib/messaging";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/** Messaging actions (addendum 2, A4). */

/**
 * Sends one message to one number, typed by an admin.
 *
 * This is both the "does the gateway work at all" test and the way the office
 * sends a one-off message to somebody, so it is rate limited per admin: a
 * gateway is charged per SMS, and a stuck loop here costs real money.
 */
export async function sendTestMessage(input: {
  to: string;
  body: string;
  channel?: "SMS" | "WHATSAPP";
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("messages.manage");

  const phone = normalizePhone(input.to);
  if (!phone) return { ok: false, error: "Enter a valid Bangladeshi mobile number." };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Write the message first." };
  if (body.length > 640) {
    return { ok: false, error: "That is too long for an SMS. Keep it under 640 characters." };
  }

  const limit = await checkRateLimit("message", admin.id);
  if (!limit.allowed) {
    return { ok: false, error: "Too many messages from this account in the last hour." };
  }

  const result = await sendMessage({
    channel: input.channel ?? "SMS",
    to: phone,
    body,
    template: "manual",
    userId: admin.id,
  });

  await logActivity(admin.id, "message", "message", result.logId ?? null);
  revalidatePath("/admin/messages");

  return result.sent
    ? { ok: true }
    : { ok: false, error: result.reason ?? "The message did not go out." };
}

/**
 * Writes any built-in template the office has not saved yet.
 *
 * Kept as a button rather than a seed step so the wording can be restored
 * after somebody deletes a row, on a site that is already live.
 */
export async function restoreDefaultTemplates(): Promise<{
  ok: boolean;
  added?: number;
}> {
  const admin = await requirePermission("messages.manage");
  let added = 0;

  for (const entry of DEFAULT_TEMPLATES) {
    const existing = await prisma.messageTemplate.findUnique({
      where: { key: entry.key },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.messageTemplate.create({
      data: {
        key: entry.key,
        name: entry.name,
        channel: entry.channel,
        body: entry.body,
        note: entry.note,
      },
    });
    added += 1;
  }

  await logActivity(admin.id, "restore-templates", "messageTemplate");
  revalidatePath("/admin/message-templates");
  return { ok: true, added };
}

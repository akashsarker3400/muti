import "server-only";

import type { MessageChannel } from "@/generated/prisma/enums";
import { DEFAULT_TEMPLATES, type TemplateKey } from "@/lib/messaging-defaults";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { sendSms, smsConfigured } from "@/lib/sms";
import { sendWhatsApp, whatsAppConfigured } from "@/lib/whatsapp-api";

/**
 * One way in and out for SMS and WhatsApp (addendum 2, A4).
 *
 * Every message is written to `MessageLog` whether it went or not, because
 * the question the office actually asks is "was the student told?", and an
 * unsent message is an answer to that question too.
 *
 * Automatic messages carry a `dedupeKey`. The column is unique, so a
 * reminder cannot be sent twice however often the scheduler runs, even if two
 * runs overlap: the second insert simply loses the race.
 */

export { DEFAULT_TEMPLATES, type TemplateKey } from "@/lib/messaging-defaults";

/** Values a template may refer to. Anything missing renders as an empty string. */
export type TemplateValues = Partial<
  Record<
    | "name"
    | "course"
    | "batch"
    | "date"
    | "time"
    | "serial"
    | "roll"
    | "institute"
    | "phone"
    | "amount"
    | "receipt",
    string | null | undefined
  >
>;

/**
 * Substitutes `{placeholder}` from `values`. A name the caller did not supply
 * is left exactly as typed, so a typo in a template is visible in the outbox
 * rather than turning into a blank the office never notices.
 */
export function renderTemplate(body: string, values: TemplateValues): string {
  return body.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = (values as Record<string, string | null | undefined>)[key];
    return value == null || value === "" ? whole : String(value);
  });
}

/** The template row, or the built-in default when the office has not saved one. */
export async function templateBody(
  key: TemplateKey,
): Promise<{ body: string; channel: MessageChannel; active: boolean } | null> {
  const row = await prisma.messageTemplate.findUnique({ where: { key } });
  if (row) return { body: row.body, channel: row.channel, active: row.active };

  const fallback = DEFAULT_TEMPLATES.find((entry) => entry.key === key);
  return fallback
    ? { body: fallback.body, channel: fallback.channel, active: true }
    : null;
}

export type SendResult = { sent: boolean; reason?: string; logId?: string };

/**
 * Sends one message and records it.
 *
 * `dedupeKey` makes the call idempotent; pass one for anything the scheduler
 * sends and leave it out for anything a person pressed.
 */
export async function sendMessage(input: {
  channel: MessageChannel;
  to: string;
  body: string;
  template?: string;
  entity?: string;
  entityId?: string;
  dedupeKey?: string;
  userId?: string;
}): Promise<SendResult> {
  const { channel, body } = input;

  if (input.dedupeKey) {
    const already = await prisma.messageLog.findUnique({
      where: { dedupeKey: input.dedupeKey },
      select: { id: true },
    });
    if (already) return { sent: false, reason: "Already sent" };
  }

  const to = channel === "EMAIL" ? input.to.trim() : (normalizePhone(input.to) ?? "");
  if (!to) {
    return record(input, "SKIPPED", null, "No usable phone number on the record");
  }
  if (!body.trim()) {
    return record({ ...input, to }, "SKIPPED", null, "The template is empty");
  }

  if (channel === "SMS") {
    if (!smsConfigured()) {
      return record(
        { ...input, to },
        "SKIPPED",
        "none",
        "No SMS gateway is configured",
      );
    }
    const result = await sendSms(to, body);
    return record(
      { ...input, to },
      result.sent ? "SENT" : "FAILED",
      result.provider,
      result.reason,
    );
  }

  if (channel === "WHATSAPP") {
    if (!whatsAppConfigured()) {
      return record(
        { ...input, to },
        "SKIPPED",
        "none",
        "WhatsApp is not connected; use the chat link instead",
      );
    }
    const result = await sendWhatsApp(to, body);
    return record(
      { ...input, to },
      result.sent ? "SENT" : "FAILED",
      "whatsapp-cloud",
      result.reason,
    );
  }

  // Email has its own layer with its own fallbacks; nothing here sends it.
  return record({ ...input, to }, "SKIPPED", null, "Email is sent by the mail layer");
}

async function record(
  input: {
    channel: MessageChannel;
    to: string;
    body: string;
    template?: string;
    entity?: string;
    entityId?: string;
    dedupeKey?: string;
    userId?: string;
  },
  status: "SENT" | "FAILED" | "SKIPPED",
  provider: string | null,
  error?: string,
): Promise<SendResult> {
  try {
    const row = await prisma.messageLog.create({
      data: {
        channel: input.channel,
        to: input.to,
        body: input.body,
        status,
        provider,
        error: error ?? null,
        template: input.template ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        userId: input.userId ?? null,
      },
      select: { id: true },
    });
    return { sent: status === "SENT", reason: error, logId: row.id };
  } catch (error) {
    // A unique violation here means another run won the race, which is the
    // dedupe key doing its job rather than a fault.
    console.error("Could not write the message log", error);
    return { sent: false, reason: "Already sent" };
  }
}

/**
 * Sends a named template, looking up its wording and channel.
 * Returns `skipped` when the office has switched that template off.
 */
export async function sendTemplate(input: {
  key: TemplateKey;
  to: string;
  values: TemplateValues;
  entity?: string;
  entityId?: string;
  dedupeKey?: string;
  userId?: string;
}): Promise<SendResult> {
  const template = await templateBody(input.key);
  if (!template) return { sent: false, reason: "No such template" };
  if (!template.active) return { sent: false, reason: "Template is switched off" };

  return sendMessage({
    channel: template.channel,
    to: input.to,
    body: renderTemplate(template.body, input.values),
    template: input.key,
    entity: input.entity,
    entityId: input.entityId,
    dedupeKey: input.dedupeKey,
    userId: input.userId,
  });
}

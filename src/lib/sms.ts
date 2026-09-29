import "server-only";

import { optionalEnv } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";

/**
 * Outgoing SMS (addendum 2, A4).
 *
 * Bangladeshi gateways all speak slightly different HTTP, and the office may
 * change reseller at any time, so the provider is a single environment
 * variable and the payload for each one is built here. Nothing else in the
 * app knows which gateway is in use.
 *
 *   SMS_PROVIDER   bulksmsbd | sslwireless | generic   (unset = not sending)
 *   SMS_API_KEY    the key or token from the gateway
 *   SMS_SENDER_ID  the approved masking/sender id, where the gateway needs one
 *   SMS_API_URL    generic provider only: the endpoint
 *
 * Without `SMS_PROVIDER` nothing is sent and the caller records a SKIPPED row.
 * That is deliberate: a half-configured gateway must not silently swallow
 * messages the office believes went out.
 */

export type SmsProvider = "esms" | "bulksmsbd" | "sslwireless" | "generic";

export type SmsResult = {
  sent: boolean;
  provider: string;
  /** Why it did not go, in words the office can act on. */
  reason?: string;
};

const PROVIDERS: SmsProvider[] = ["esms", "bulksmsbd", "sslwireless", "generic"];

export function smsProvider(): SmsProvider | null {
  const value = optionalEnv("SMS_PROVIDER")?.toLowerCase();
  // "dianasms" is the same Xend platform under a different brand, so it is
  // accepted as a spelling of the same provider rather than a second one.
  if (value === "dianasms") return "esms";
  return PROVIDERS.find((entry) => entry === value) ?? null;
}

export const smsConfigured = () => smsProvider() !== null;

/** Most gateways want 8801XXXXXXXXX, without the plus. */
export function gatewayNumber(phone: string): string | null {
  const normalized = normalizePhone(phone);
  return normalized ? normalized.replace(/^\+/, "") : null;
}

/**
 * Bangla needs the unicode message type on the Xend platform. Sending Bangla
 * as "plain" delivers mojibake and is still charged, so the type is decided
 * from the text rather than left to whoever fills in the template.
 */
export function isUnicode(message: string): boolean {
  return /[^\u0000-\u007F]/.test(message);
}

/**
 * The eSMS / DianaSMS base URL. Both are the same Xend installation under
 * different brands, so the host is configurable and the path is not; a full
 * endpoint pasted from the docs is accepted as it stands.
 */
function xendEndpoint(url: string | undefined): string {
  const base = (url ?? "https://login.esms.com.bd").trim().replace(/\/+$/, "");
  return base.includes("/sms/send") ? base : `${base}/api/v3/sms/send`;
}

/**
 * The request for one provider, kept pure so it can be unit tested without
 * touching the network.
 */
export function buildRequest(
  provider: SmsProvider,
  options: { apiKey: string; senderId?: string; url?: string },
  number: string,
  message: string,
): { url: string; init: RequestInit } {
  switch (provider) {
    // eSMS / DianaSMS (the Xend platform, https://esms.com.bd). Bearer token,
    // form-encoded body, one number or a comma separated list.
    case "esms": {
      const body = new URLSearchParams({
        recipient: number,
        sender_id: options.senderId ?? "",
        type: isUnicode(message) ? "unicode" : "plain",
        message,
      });
      return {
        url: xendEndpoint(options.url),
        init: {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        },
      };
    }

    // https://bulksmsbd.net — the common reseller; form-encoded, one number
    // or a comma separated list.
    case "bulksmsbd": {
      const body = new URLSearchParams({
        api_key: options.apiKey,
        type: "text",
        number,
        senderid: options.senderId ?? "",
        message,
      });
      return {
        url: "https://bulksmsbd.net/api/smsapi",
        init: {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
      };
    }

    // SSL Wireless, used by most banks and larger institutes here.
    case "sslwireless": {
      return {
        url: "https://smsplus.sslwireless.com/api/v3/send-sms",
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            api_token: options.apiKey,
            sid: options.senderId ?? "",
            msisdn: number,
            sms: message,
            // The gateway rejects a repeated id, which is its own protection
            // against a retry sending the same text twice.
            csms_id: `muti${Date.now().toString(36)}`,
          }),
        },
      };
    }

    // Anything else: the office pastes the URL its reseller gave them, with
    // {key}, {number} and {message} where those values belong.
    case "generic": {
      const template = options.url ?? "";
      const url = template
        .replaceAll("{key}", encodeURIComponent(options.apiKey))
        .replaceAll("{number}", encodeURIComponent(number))
        .replaceAll("{sender}", encodeURIComponent(options.senderId ?? ""))
        .replaceAll("{message}", encodeURIComponent(message));
      return { url, init: { method: "GET" } };
    }
  }
}

/**
 * What the gateway's answer actually means.
 *
 * Every one of these answers 200 with the failure in the body, so the status
 * code alone proves nothing. Kept pure and tested, because "the office
 * believes forty messages went out and none did" is the failure that matters.
 */
export function interpret(
  provider: SmsProvider,
  status: number,
  text: string,
): { sent: true } | { sent: false; reason: string } {
  if (status < 200 || status >= 300) {
    return { sent: false, reason: `${status}: ${text}` };
  }

  if (provider === "esms") {
    // { "status": "success", "data": … } or { "status": "error", "message": … }
    try {
      const body = JSON.parse(text) as { status?: string; message?: string };
      if (body.status === "success") return { sent: true };
      return {
        sent: false,
        reason: body.message ?? text ?? "The gateway refused the message",
      };
    } catch {
      // Not the JSON the documentation promises: an HTML login page usually
      // means the token is wrong or expired.
      return { sent: false, reason: `Unexpected answer from the gateway: ${text}` };
    }
  }

  if (/error|invalid|fail|denied|insufficient/i.test(text)) {
    return { sent: false, reason: text };
  }
  return { sent: true };
}

/**
 * Sends one message. Never throws: a gateway being down must not fail the
 * admission the office was saving at the time.
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const provider = smsProvider();
  if (!provider) {
    return { sent: false, provider: "none", reason: "No SMS gateway is configured" };
  }

  const apiKey = optionalEnv("SMS_API_KEY");
  if (!apiKey) {
    return { sent: false, provider, reason: "SMS_API_KEY is not set" };
  }

  const number = gatewayNumber(phone);
  if (!number) {
    return { sent: false, provider, reason: "Not a valid Bangladeshi mobile number" };
  }

  const { url, init } = buildRequest(
    provider,
    {
      apiKey,
      senderId: optionalEnv("SMS_SENDER_ID"),
      url: optionalEnv("SMS_API_URL"),
    },
    number,
    message,
  );

  if (!url) {
    return { sent: false, provider, reason: "SMS_API_URL is not set" };
  }

  try {
    // Ten seconds: a slow gateway must never hold a form open.
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    const text = (await response.text()).slice(0, 300);
    const verdict = interpret(provider, response.status, text);
    return verdict.sent
      ? { sent: true, provider }
      : { sent: false, provider, reason: verdict.reason };
  } catch (error) {
    console.error("SMS gateway request failed", error);
    return { sent: false, provider, reason: "The gateway could not be reached" };
  }
}

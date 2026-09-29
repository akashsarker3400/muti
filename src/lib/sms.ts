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

export type SmsProvider = "bulksmsbd" | "sslwireless" | "generic";

export type SmsResult = {
  sent: boolean;
  provider: string;
  /** Why it did not go, in words the office can act on. */
  reason?: string;
};

export function smsProvider(): SmsProvider | null {
  const value = optionalEnv("SMS_PROVIDER")?.toLowerCase();
  if (value === "bulksmsbd" || value === "sslwireless" || value === "generic") {
    return value;
  }
  return null;
}

export const smsConfigured = () => smsProvider() !== null;

/** Most gateways want 8801XXXXXXXXX, without the plus. */
export function gatewayNumber(phone: string): string | null {
  const normalized = normalizePhone(phone);
  return normalized ? normalized.replace(/^\+/, "") : null;
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

    if (!response.ok) {
      return { sent: false, provider, reason: `${response.status}: ${text}` };
    }

    // Both gateways answer 200 with an error code in the body, so the body has
    // to be read rather than trusted.
    if (/error|invalid|fail|denied|insufficient/i.test(text)) {
      return { sent: false, provider, reason: text };
    }

    return { sent: true, provider };
  } catch (error) {
    console.error("SMS gateway request failed", error);
    return { sent: false, provider, reason: "The gateway could not be reached" };
  }
}

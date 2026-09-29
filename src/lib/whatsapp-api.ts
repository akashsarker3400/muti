import "server-only";

import { optionalEnv } from "@/lib/env";
import { waNumber } from "@/lib/phone";

/**
 * WhatsApp Cloud API (addendum 2, A4).
 *
 *   WHATSAPP_TOKEN      permanent access token from the Meta app
 *   WHATSAPP_PHONE_ID   the phone number id of the business number
 *
 * Worth being honest about the limit: Meta only allows a free-form text
 * message inside the 24 hours after the person last wrote to the business.
 * Outside that window only an approved template message is delivered, and
 * templates are approved per account, so this sends text and reports what
 * Meta says rather than pretending every message arrives.
 *
 * Unconfigured, the office keeps using the click-to-chat links the site has
 * everywhere (`waLink`), which need no account and always work.
 */

export function whatsAppConfigured(): boolean {
  return Boolean(optionalEnv("WHATSAPP_TOKEN") && optionalEnv("WHATSAPP_PHONE_ID"));
}

export async function sendWhatsApp(
  phone: string,
  message: string,
): Promise<{ sent: boolean; reason?: string }> {
  const token = optionalEnv("WHATSAPP_TOKEN");
  const phoneId = optionalEnv("WHATSAPP_PHONE_ID");
  if (!token || !phoneId) {
    return { sent: false, reason: "WhatsApp is not connected" };
  }

  const to = waNumber(phone);
  if (!to) return { sent: false, reason: "Not a valid number" };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: false, body: message },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.ok) return { sent: true };

    // Meta's error body names the reason, and the commonest one by far is the
    // 24-hour window, which the office needs to read rather than guess at.
    const detail = (await response.text()).slice(0, 300);
    return { sent: false, reason: `${response.status}: ${detail}` };
  } catch (error) {
    console.error("WhatsApp request failed", error);
    return { sent: false, reason: "WhatsApp could not be reached" };
  }
}

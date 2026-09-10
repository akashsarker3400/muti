import { waNumber } from "./phone";

/**
 * Builds a wa.me deep link with a URL-encoded prefilled message (section 4).
 * Every CTA on the site goes through here so the number and encoding are
 * defined in exactly one place.
 */
export function waLink(phone: string, message?: string): string {
  const number = waNumber(phone);
  const base = `https://wa.me/${number}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

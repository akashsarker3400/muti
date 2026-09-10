import { toEnglishDigits } from "./format";

/** Bangladeshi mobile numbers, with or without the country code (section 11). */
export const BD_PHONE_REGEX = /^(\+?88)?01[3-9]\d{8}$/;

/**
 * Accepts the many shapes people actually type — 01778-838644, +880 1778 838644,
 * ০১৭৭৮৮৩৮৬৪৪ — and returns the canonical +8801XXXXXXXXX, or null if invalid.
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;

  const compact = toEnglishDigits(input).replace(/[\s\-().]/g, "");
  if (!BD_PHONE_REGEX.test(compact)) return null;

  const withoutCode = compact.replace(/^\+?88/, "");
  return `+88${withoutCode}`;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** "+8801778838644" -> "01778-838644" for display. */
export function displayPhone(input: string): string {
  const normalized = normalizePhone(input);
  const local = (normalized ?? input).replace(/^\+?88/, "");
  return local.length === 11 ? `${local.slice(0, 5)}-${local.slice(5)}` : local;
}

/** "+8801778838644" -> "8801778838644", the form wa.me expects. */
export function waNumber(input: string): string {
  const normalized = normalizePhone(input);
  return (normalized ?? input).replace(/^\+/, "").replace(/\D/g, "");
}

/** tel: href with the full international number. */
export function telHref(input: string): string {
  const normalized = normalizePhone(input);
  return `tel:${normalized ?? input}`;
}

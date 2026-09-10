import type { Locale } from "@/i18n/routing";

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/**
 * Converts every ASCII digit in a string to its Bangla equivalent.
 * Non-digit characters (commas, currency signs, letters) pass through.
 */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

/** Groups an integer with thousand separators, e.g. 30750 -> "30,750". */
export function groupDigits(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.trunc(value));
}

/**
 * Money for the public site: "৳ ৩০,৭৫০" in Bangla, "Tk 30,750" in English
 * (section 9).
 */
export function formatMoney(value: number, locale: Locale): string {
  const grouped = groupDigits(value);
  return locale === "bn" ? `৳ ${toBanglaDigits(grouped)}` : `Tk ${grouped}`;
}

/** Plain number in the reader's script — used for counters and class counts. */
export function formatNumber(value: number, locale: Locale): string {
  const grouped = groupDigits(value);
  return locale === "bn" ? toBanglaDigits(grouped) : grouped;
}

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Dates for the public site: "১২ সেপ্টেম্বর ২০২৬" / "12 Sep 2026" (section 9).
 * Rendered from UTC parts so the server and the browser always agree.
 */
export function formatDate(
  date: Date | string | null | undefined,
  locale: Locale,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();

  return locale === "bn"
    ? `${toBanglaDigits(day)} ${BN_MONTHS[month]} ${toBanglaDigits(year)}`
    : `${day} ${EN_MONTHS[month]} ${year}`;
}

/** Longer form used on notice/blog detail pages. */
export function formatDateTime(
  date: Date | string | null | undefined,
  locale: Locale,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const time = `${String(hours).padStart(2, "0")}:${minutes}`;

  return locale === "bn"
    ? `${formatDate(d, locale)}, ${toBanglaDigits(time)}`
    : `${formatDate(d, locale)}, ${time}`;
}

/**
 * Picks the reader's language, falling back to Bangla when the English
 * translation has not been filled in yet (section 9).
 */
export function pick(
  locale: Locale,
  bn: string | null | undefined,
  en: string | null | undefined,
): string {
  if (locale === "en") return en?.trim() ? en : (bn ?? "");
  return bn?.trim() ? bn : (en ?? "");
}

/** Same as {@link pick} but returns undefined instead of an empty string. */
export function pickOptional(
  locale: Locale,
  bn: string | null | undefined,
  en: string | null | undefined,
): string | undefined {
  const value = pick(locale, bn, en);
  return value.trim() ? value : undefined;
}

/** Number of completed years since the institute was established. */
export function yearsOfExperience(establishedYear: number, now = new Date()) {
  return Math.max(0, now.getUTCFullYear() - establishedYear);
}

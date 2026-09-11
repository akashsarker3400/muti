import { defineRouting } from "next-intl/routing";

export const locales = ["en", "bn"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * English is the default and has no URL prefix; Bangla lives under /bn/…
 * (locale change, September 2026 — the reverse of the original spec).
 *
 * `localeDetection` reads Accept-Language on the very first visit only:
 * next-intl then remembers the choice in the NEXT_LOCALE cookie, and the
 * language switch writes the same cookie, so a visitor who picked English is
 * never bounced to /bn by their browser settings again.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

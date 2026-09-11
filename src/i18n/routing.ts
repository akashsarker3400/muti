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

/** Path of a public page in `locale`: English at the root, Bangla under /bn. */
export function localizedPath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

/** `alternates` metadata for a public page: canonical + hreflang, x-default = en. */
export function pageAlternates(locale: Locale, path: string) {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      en: localizedPath("en", path),
      bn: localizedPath("bn", path),
      "x-default": localizedPath("en", path),
    },
  };
}

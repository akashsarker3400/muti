import { defineRouting } from "next-intl/routing";

export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "bn";

/**
 * Bangla is the default and has no URL prefix; English lives under /en/...
 * (section 2 of the spec).
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});

import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

type Messages = Record<string, unknown>;

/** Deep merge: every key of `base` survives unless `over` defines it. */
function withFallback(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = out[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object"
        ? withFallback(current as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // English is the source of truth; a Bangla gap shows the English string
  // rather than a missing-message error.
  const en = (await import("../../messages/en.json")).default as Messages;
  const messages =
    locale === "en"
      ? en
      : withFallback(en, (await import(`../../messages/${locale}.json`)).default as Messages);

  return { locale, messages };
});

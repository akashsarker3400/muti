import { ArrowRight, HeartPulse } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { OpenBadge } from "@/components/site/health/open-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick, toBanglaDigits } from "@/lib/format";
import { healthStats, openToday } from "@/lib/health";
import type { SiteSettings } from "@/lib/site-settings";

/**
 * Homepage band for the free health service (addendum 4, §1.2): a light
 * green tint on the soft background, two lines of copy, up to three stat
 * tiles and two buttons. Only renders once the office publishes the service.
 */
export async function HealthBand({
  settings,
  locale,
}: {
  settings: SiteSettings;
  locale: Locale;
}) {
  const health = settings.health;
  if (!health.published) return null;

  const [t, stats] = await Promise.all([
    getTranslations("health"),
    healthStats(health),
  ]);
  const digits = (value: number) =>
    locale === "bn" ? toBanglaDigits(String(value)) : value.toLocaleString("en");

  const tiles = [
    stats.patientsTotal > 0 && {
      value: `${digits(stats.patientsTotal)}+`,
      label: t("statPatients"),
    },
    health.daysPerWeek > 0 && {
      value: digits(health.daysPerWeek),
      label: t("statDaysPerWeek"),
    },
    health.sinceYear > 0 && { value: digits(health.sinceYear), label: t("statSince") },
  ].filter(Boolean) as Array<{ value: string; label: string }>;

  return (
    <section
      className="border-y border-[color:var(--success)]/25 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--success)_10%,var(--bg-soft))_0%,var(--bg-soft)_60%)]"
      data-testid="health-band"
    >
      <div className="container-content grid items-center gap-8 py-12 lg:grid-cols-[1.2fr_1fr] lg:py-16">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--success)]/40 bg-white px-3 py-1 text-xs font-semibold text-[color:var(--success-ink)]">
            <HeartPulse className="size-4" aria-hidden="true" />
            {t("eyebrow")}
            <OpenBadge
              state={openToday(health)}
              labels={{ open: t("openToday"), closed: t("closedToday") }}
            />
          </p>
          <h2 className="h2 text-balance">{t("bandTitle")}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[color:var(--muted-foreground)]">
            {pick(locale, health.introBn, health.introEn)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="cta-lg">
              <Link href="/health-service#serial">{t("getSerial")}</Link>
            </Button>
            <Button asChild variant="brandOutline" size="cta-lg">
              <Link href="/health-service">
                {t("details")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        {tiles.length > 0 && (
          <ul className="grid grid-cols-3 gap-3">
            {tiles.map((tile) => (
              <li
                key={tile.label}
                className="rounded-[14px] border border-[color:var(--border)] bg-white p-4 text-center shadow-[var(--shadow-card)]"
              >
                <p className="nums font-latin text-2xl font-bold text-[color:var(--success-ink)] sm:text-3xl">
                  {tile.value}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  {tile.label}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

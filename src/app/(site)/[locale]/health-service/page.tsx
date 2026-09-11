import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  FileText,
  HandHeart,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryGrid } from "@/components/site/gallery-grid";
import { HealthSerialForm } from "@/components/site/health-serial-form";
import { OpenBadge } from "@/components/site/health/open-badge";
import { WHY_ICONS, type WhyIconName } from "@/components/site/home/why-choose";
import { SiteImage } from "@/components/site/media";
import { PartnersRow } from "@/components/site/partners-row";
import { RichText } from "@/components/site/rich-text";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content-items";
import { siteUrl } from "@/lib/env";
import { formatDate, pick, toBanglaDigits } from "@/lib/format";
import { healthStats, openToday, WEEKDAY_LABELS, type Weekday } from "@/lib/health";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getPartners } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings();
  if (!settings.health.published) return { robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "health" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: [
      "free ultrasound mymensingh",
      "বিনামূল্যে আল্ট্রাসাউন্ড ময়মনসিংহ",
      "free doctor consultation mymensingh",
    ],
    alternates: {
      canonical: locale === "bn" ? "/health-service" : "/en/health-service",
    },
  };
}

async function getHealthAlbumImages() {
  try {
    return await prisma.galleryImage.findMany({
      where: { album: { isHealthService: true } },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: 12,
      include: { album: true },
    });
  } catch (error) {
    console.error("getHealthAlbumImages failed", error);
    return [];
  }
}

/** Free health service page (addendum 4, §2). 404 until the office publishes it. */
export default async function HealthServicePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const settings = await getSiteSettings();
  const health = settings.health;
  if (!health.published) notFound();

  const [t, common, services, stats, images, supporters] = await Promise.all([
    getTranslations("health"),
    getTranslations("common"),
    getContent("HEALTH_SERVICE", locale),
    healthStats(health),
    getHealthAlbumImages(),
    getPartners(["COMMUNITY"]),
  ]);

  const digits = (value: number | string) =>
    locale === "bn" ? toBanglaDigits(String(value)) : String(value);
  const phone = settings.contact.phone1;
  const address = pick(locale, settings.contact.addressBn, settings.contact.addressEn);
  const state = openToday(health);
  const days = pick(locale, health.daysBn, health.daysEn);
  const time = pick(locale, health.timeBn, health.timeEn);
  const eligibility = pick(locale, health.eligibilityBn, health.eligibilityEn);
  const transparency = pick(locale, health.transparencyBn, health.transparencyEn);
  const holidayNote = pick(locale, health.holidayNoteBn, health.holidayNoteEn);

  const steps = [
    { icon: Phone, text: t("step1") },
    { icon: CalendarDays, text: t("step2") },
    { icon: Stethoscope, text: t("step3") },
    { icon: FileText, text: t("step4") },
  ];

  const statTiles = [
    stats.patientsTotal > 0 && { value: stats.patientsTotal, label: t("statPatients") },
    stats.patientsThisMonth > 0 && {
      value: stats.patientsThisMonth,
      label: t("statThisMonth"),
    },
    stats.reportsTotal > 0 && { value: stats.reportsTotal, label: t("statReports") },
  ].filter(Boolean) as Array<{ value: number; label: string }>;

  const openingHours = health.openDays.map((day) => {
    const long = WEEKDAY_LABELS[day as Weekday]?.en ?? day;
    return { "@type": "OpeningHoursSpecification", dayOfWeek: long };
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: `${settings.general.nameEn} — Free Health Service`,
    description: health.introEn || health.introBn,
    url: `${siteUrl}/health-service`,
    telephone: phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.contact.addressEn,
      addressLocality: "Mymensingh",
      addressCountry: "BD",
    },
    isAcceptingNewPatients: state !== "closed",
    priceRange: "Free",
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
    parentOrganization: {
      "@type": "EducationalOrganization",
      name: settings.general.nameEn,
      url: siteUrl,
    },
  };

  return (
    <>
      {/* ---- 1. Hero -------------------------------------------------------- */}
      <section className="border-b border-[color:var(--success)]/25 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--success)_12%,var(--bg-soft))_0%,var(--bg-soft)_60%)]">
        <div className="container-content grid items-center gap-8 py-10 md:py-14 lg:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--success)]/40 bg-white px-3 py-1 text-xs font-semibold text-[color:var(--success-ink)]">
              <HandHeart className="size-4" aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h1 className="h1 text-balance">{t("title")}</h1>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-[color:var(--muted-foreground)]">
              {t("subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild variant="accent" size="cta-lg">
                <a href="#serial">{t("getSerial")}</a>
              </Button>
              <Button asChild variant="brandOutline" size="cta-lg">
                <a href={`tel:${phone}`}>
                  <Phone className="size-4" aria-hidden="true" />
                  {displayPhone(phone)}
                </a>
              </Button>
              <OpenBadge
                state={state}
                labels={{ open: t("openToday"), closed: t("closedToday") }}
              />
            </div>
          </div>
          <SiteImage
            src={health.heroImage}
            alt={t("title")}
            className="aspect-[4/3] w-full lg:aspect-[5/4]"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            placeholderLabel={t("heroPlaceholder")}
          />
        </div>
      </section>

      {/* ---- 2. What we provide -------------------------------------------- */}
      {services.length > 0 && (
        <Section>
          <SectionHeading title={t("provideTitle")} align="center" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((item) => {
              const Icon = WHY_ICONS[item.icon as WhyIconName] ?? BadgeCheck;
              return (
                <li
                  key={item.id}
                  className="flex h-full flex-col items-center rounded-[14px] border border-[color:var(--border)] bg-white p-5 text-center shadow-[var(--shadow-card)]"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-[color:var(--success)]/12 text-[color:var(--success-ink)]">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <p className="mt-3 font-medium">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ---- 3 + 4. Who can get it / schedule ------------------------------ */}
      <Section soft>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[14px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-xl font-semibold">{t("whoTitle")}</h2>
            {eligibility ? <RichText html={eligibility} /> : null}
          </div>

          <div
            className="rounded-[14px] border border-[color:var(--success)]/30 bg-white p-6 shadow-[var(--shadow-card)]"
            data-testid="health-schedule"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{t("scheduleTitle")}</h2>
              <OpenBadge
                state={state}
                labels={{ open: t("openToday"), closed: t("closedToday") }}
              />
            </div>
            {health.holiday && holidayNote && (
              <p className="mb-3 rounded-lg bg-[color:var(--warning)]/12 p-3 text-sm text-[color:var(--warning-ink)]">
                {holidayNote}
              </p>
            )}
            <dl className="space-y-3 text-sm">
              {days && (
                <div className="flex gap-3">
                  <dt className="shrink-0">
                    <CalendarDays
                      className="size-5 text-[color:var(--success-ink)]"
                      aria-hidden="true"
                    />
                  </dt>
                  <dd>
                    <span className="sr-only">{t("days")}: </span>
                    {days}
                  </dd>
                </div>
              )}
              {time && (
                <div className="flex gap-3">
                  <dt className="shrink-0">
                    <Clock
                      className="size-5 text-[color:var(--success-ink)]"
                      aria-hidden="true"
                    />
                  </dt>
                  <dd>
                    <span className="sr-only">{t("time")}: </span>
                    {time}
                  </dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="shrink-0">
                  <MapPin
                    className="size-5 text-[color:var(--accent-red)]"
                    aria-hidden="true"
                  />
                </dt>
                <dd>{address}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="shrink-0">
                  <Phone
                    className="size-5 text-[color:var(--brand)]"
                    aria-hidden="true"
                  />
                </dt>
                <dd>
                  <a
                    href={`tel:${phone}`}
                    className="font-latin font-semibold hover:underline"
                  >
                    {displayPhone(phone)}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      {/* ---- 5. How it works ----------------------------------------------- */}
      <Section>
        <SectionHeading title={t("howTitle")} align="center" />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.text}
              className="relative rounded-[14px] border border-[color:var(--border)] bg-white p-5 pt-6 shadow-[var(--shadow-card)]"
            >
              <span className="absolute start-5 -top-3 grid size-7 place-items-center rounded-full bg-[color:var(--accent-red)] font-latin text-xs font-bold text-white">
                {digits(index + 1)}
              </span>
              <step.icon
                className="size-6 text-[color:var(--success-ink)]"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---- 6. Serial form -------------------------------------------------- */}
      <Section soft>
        <div id="serial" className="mx-auto max-w-2xl scroll-mt-24">
          <SectionHeading
            title={t("serialTitle")}
            subtitle={t("serialSubtitle")}
            align="center"
          />
          <HealthSerialForm
            locale={locale}
            phone={phone}
            whatsapp={settings.contact.whatsapp}
            address={address}
            turnstileSiteKey={settings.security.turnstileSiteKey}
          />
        </div>
      </Section>

      {/* ---- 7. Impact ------------------------------------------------------ */}
      {statTiles.length > 0 && (
        <Section>
          <SectionHeading
            title={t("impactTitle")}
            subtitle={
              stats.updatedAt
                ? t("updatedOn", { date: formatDate(stats.updatedAt, locale) })
                : undefined
            }
            align="center"
          />
          <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {statTiles.map((tile) => (
              <li
                key={tile.label}
                className="rounded-[14px] border border-[color:var(--border)] bg-white p-6 text-center shadow-[var(--shadow-card)]"
              >
                <p className="nums font-latin text-4xl font-bold text-[color:var(--success-ink)]">
                  {digits(tile.value)}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  {tile.label}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ---- 8. Transparency ------------------------------------------------ */}
      {transparency && (
        <Section soft>
          <div className="mx-auto max-w-3xl rounded-[14px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-2 text-base font-semibold">{t("transparencyTitle")}</h2>
            <RichText html={transparency} />
          </div>
        </Section>
      )}

      {/* ---- 9. Gallery ------------------------------------------------------ */}
      {images.length > 0 && (
        <Section>
          <SectionHeading title={t("galleryTitle")} />
          <GalleryGrid
            items={images.map((image) => ({
              id: image.id,
              url: image.url,
              caption: image.caption,
              album: image.album.title,
            }))}
          />
        </Section>
      )}

      {/* ---- 10. Supporters -------------------------------------------------- */}
      <PartnersRow partners={supporters} soft />

      {/* ---- 11. Support CTA ------------------------------------------------ */}
      {health.showSupportCta && (
        <Section>
          <div className="rounded-2xl bg-[color:var(--brand)] p-8 text-center text-white">
            <h2 className="text-2xl font-semibold">{t("supportTitle")}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-white/85">
              {pick(locale, health.supportTextBn, health.supportTextEn)}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild variant="accent" size="cta-lg">
                <Link href="/contact">{t("supportContact")}</Link>
              </Button>
              <Button asChild variant="whatsapp" size="cta-lg">
                <a
                  href={waLink(settings.contact.whatsapp, t("supportWhatsapp"))}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {common("whatsapp")}
                </a>
              </Button>
            </div>
          </div>
        </Section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { Compass, HeartHandshake, Target } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { PartnersRow } from "@/components/site/partners-row";
import { RichText } from "@/components/site/rich-text";
import { Section, SectionHeading } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getContent } from "@/lib/content-items";
import { getPageBySlug, getPartners } from "@/lib/queries";
import { isEmptyRichText } from "@/lib/sanitize";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    alternates: { canonical: locale === "en" ? "/about" : "/bn/about" },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, story, partners, pillars, t] = await Promise.all([
    getSiteSettings(),
    getPageBySlug("about-story"),
    getPartners(),
    getContent("VALUE", locale),
    getTranslations("about"),
  ]);

  // The three cards keep a fixed icon order; the words come from the admin.
  const PILLAR_ICONS = [Target, Compass, HeartHandshake];

  const storyHtml = story ? pick(locale, story.bodyBn, story.bodyEn) : "";

  return (
    <>
      <PageHero
        title={t("title")}
        subtitle={pick(locale, settings.general.taglineBn, settings.general.taglineEn)}
      />

      {!isEmptyRichText(storyHtml) && (
        <Section>
          <div className="max-w-3xl">
            <SectionHeading title={t("storyTitle")} />
            <RichText html={storyHtml} />
          </div>
        </Section>
      )}

      {pillars.length > 0 && (
        <Section soft>
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar, index) => {
              const Icon = PILLAR_ICONS[index % PILLAR_ICONS.length]!;
              return (
                <div
                  key={pillar.id}
                  className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold">{pillar.title}</h2>
                  <p className="mt-2 leading-relaxed text-[color:var(--muted-foreground)]">
                    {pillar.body}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/*
        Director's message: every field is TODO in the spec, so the whole block
        is skipped until the admin fills in a Faculty entry marked as director.
        See HANDOVER.md.
      */}
      <DirectorMessage locale={locale} />

      <PartnersRow partners={partners} showGroups />
    </>
  );
}

/**
 * The director's photo, name, degrees and message are all TODO (section 5.2).
 * Rather than invent them, the block renders only once a Faculty row whose
 * designation contains "Director" exists.
 */
async function DirectorMessage({ locale }: { locale: Locale }) {
  const [{ getFaculty }, t] = await Promise.all([
    import("@/lib/queries"),
    getTranslations("about"),
  ]);

  const faculty = await getFaculty();
  const director = faculty.find((member) =>
    /director|পরিচালক/i.test(`${member.designation} ${member.designationBn ?? ""}`),
  );

  if (!director) return null;

  const name = pick(locale, director.nameBn, director.name);

  return (
    <Section>
      <SectionHeading title={t("directorTitle")} />
      <div className="grid gap-6 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 md:grid-cols-[auto_1fr] md:gap-8">
        <div>
          {director.photo ? (
            <Image
              src={director.photo}
              alt={name}
              width={160}
              height={160}
              className="size-32 rounded-2xl object-cover md:size-40"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-32 place-items-center rounded-2xl bg-[color:var(--brand-soft)] text-4xl font-bold text-[color:var(--brand)] md:size-40"
            >
              {name.trim().charAt(0)}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold">{name}</h3>
          <p className="mt-1 font-latin text-sm text-[color:var(--muted-foreground)]">
            {director.degrees}
          </p>
          <p className="mt-1 text-sm font-medium text-[color:var(--brand)]">
            {pick(locale, director.designationBn, director.designation)}
          </p>
          {director.bio && <p className="mt-4 leading-relaxed">{director.bio}</p>}
        </div>
      </div>
    </Section>
  );
}

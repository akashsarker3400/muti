import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, BookOpen, Clock, GraduationCap, Layers } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdmissionBadge, GovtBadge, LevelBadge } from "@/components/site/badges";
import { CourseCard } from "@/components/site/course-card";
import { DocumentsList } from "@/components/site/documents-list";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { FeeCard } from "@/components/site/fee-card";
import { WhatsAppIcon } from "@/components/site/icons";
import { CourseJsonLd } from "@/components/site/json-ld";
import { RichText } from "@/components/site/rich-text";
import { RoutineTable } from "@/components/site/routine-table";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { courseFeeLabel, durationLabel, totalClasses } from "@/lib/course";
import { siteUrl } from "@/lib/env";
import { formatNumber, pick } from "@/lib/format";
import { getCourseBySlug, getGlobalFaqs, getPublishedCourses } from "@/lib/queries";
import { isEmptyRichText } from "@/lib/sanitize";
import { getSiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};

  const name = pick(locale, course.nameBn, course.nameEn);
  const fullName = pick(locale, course.fullNameBn, course.fullNameEn);
  const path = `/courses/${slug}`;

  return {
    title: course.metaTitle || `${name} — ${fullName}`,
    description:
      course.metaDescription ||
      `${fullName} at MUTI, Mymensingh. Government approved institute, code 57125.`,
    alternates: {
      canonical: locale === "bn" ? path : `/en${path}`,
      languages: { bn: path, en: `/en${path}` },
    },
    openGraph: {
      title: `${name} — ${fullName}`,
      description: course.metaDescription ?? undefined,
      images: [{ url: `/api/og?course=${encodeURIComponent(slug)}` }],
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [settings, allCourses, globalFaqs, t, common, coursesT, levels] =
    await Promise.all([
      getSiteSettings(),
      getPublishedCourses(),
      getGlobalFaqs(),
      getTranslations("course"),
      getTranslations("common"),
      getTranslations("courses"),
      getTranslations("levels"),
    ]);

  const name = pick(locale, course.nameBn, course.nameEn);
  const fullName = pick(locale, course.fullNameBn, course.fullNameEn);
  const overview = pick(locale, course.overviewBn, course.overviewEn);
  const eligibility = pick(locale, course.eligibilityBn, course.eligibilityEn);
  const certificateNote = pick(
    locale,
    course.certificateNoteBn,
    course.certificateNoteEn,
  );

  const duration = durationLabel(course, locale, {
    months: (n) => t("durationMonths", { months: n }),
    contact: common("contactForDuration"),
  });
  const fee = courseFeeLabel(course, locale, common("contactForFee"));
  const classes = totalClasses(course);

  const whatsappMessage = t("whatsappPrefill", { course: name });
  const whatsappHref = waLink(settings.contact.whatsapp, whatsappMessage);

  const related = allCourses
    .filter((other) => other.id !== course.id && other.level === course.level)
    .slice(0, 3);
  const relatedFallback = allCourses
    .filter((other) => other.id !== course.id)
    .slice(0, 3);
  const relatedCourses = related.length > 0 ? related : relatedFallback;

  return (
    <>
      {/* 1. Header */}
      <div className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
        <div className="container-content py-8 md:py-12">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <LevelBadge label={levels(course.level)} />
            <AdmissionBadge
              open={course.admissionOpen}
              labelOpen={common("admissionOpen")}
              labelClosed={common("admissionClosed")}
            />
            {course.affiliationNote && <GovtBadge label={course.affiliationNote} />}
          </div>

          <p className="font-latin text-sm font-semibold text-[color:var(--muted-foreground)]">
            {coursesT("code")} · {course.code}
          </p>
          <h1 className="h1 mt-1">{name}</h1>
          <p className="mt-2 max-w-3xl text-lg text-[color:var(--muted-foreground)]">
            {fullName}
          </p>

          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[color:var(--brand)]" aria-hidden="true" />
              <dt className="text-[color:var(--muted-foreground)]">
                {coursesT("duration")}:
              </dt>
              <dd className="font-semibold">{duration}</dd>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap
                className="size-4 text-[color:var(--brand)]"
                aria-hidden="true"
              />
              <dt className="text-[color:var(--muted-foreground)]">
                {coursesT("courseFee")}:
              </dt>
              <dd className="nums font-semibold">{fee}</dd>
            </div>
            {classes != null && classes > 0 && (
              <div className="flex items-center gap-2">
                <Layers
                  className="size-4 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                <dt className="text-[color:var(--muted-foreground)]">
                  {t("totalClasses")}:
                </dt>
                <dd className="nums font-semibold">{formatNumber(classes, locale)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="cta-lg">
              <Link href={`/apply?course=${course.slug}`}>{common("applyNow")}</Link>
            </Button>
            <Button asChild variant="whatsapp" size="cta-lg">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-5" />
                {common("whatsapp")}
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Section className="pb-28 md:pb-16">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
          <div className="min-w-0 space-y-10">
            {/* 2. Overview */}
            {!isEmptyRichText(overview) && (
              <div>
                <h2 className="h3">{t("overview")}</h2>
                <RichText html={overview} className="mt-3" />
              </div>
            )}

            {/* 4. Class structure */}
            {(course.lectureClasses != null || course.practicalClasses != null) && (
              <div>
                <h2 className="h3">{t("classStructureTitle")}</h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {course.lectureClasses != null && (
                    <ClassTile
                      label={t("lectureClasses")}
                      value={formatNumber(course.lectureClasses, locale)}
                    />
                  )}
                  {course.practicalClasses != null && (
                    <ClassTile
                      label={t("practicalClasses")}
                      value={formatNumber(course.practicalClasses, locale)}
                    />
                  )}
                  {classes != null && (
                    <ClassTile
                      label={t("totalClasses")}
                      value={formatNumber(classes, locale)}
                      emphasis
                    />
                  )}
                </dl>
              </div>
            )}

            {/* 5. Syllabus / routine */}
            {course.routines.length > 0 && (
              <div>
                <h2 className="h3 mb-4">{t("syllabusTitle")}</h2>
                <RoutineTable routines={course.routines} />
              </div>
            )}

            {/* 6. Eligibility and required documents */}
            {!isEmptyRichText(eligibility) && (
              <div>
                <h2 className="h3">{t("eligibilityTitle")}</h2>
                <RichText html={eligibility} className="mt-3" />
              </div>
            )}
            <DocumentsList locale={locale} />

            {/* 7. Certificate */}
            {certificateNote && (
              <div className="flex gap-3 rounded-[14px] border border-[color:var(--brand)]/15 bg-[color:var(--brand-soft)] p-5">
                <Award
                  className="mt-0.5 size-5 shrink-0 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-base font-semibold">{t("certificateTitle")}</h2>
                  <p className="mt-1 text-sm leading-relaxed">{certificateNote}</p>
                </div>
              </div>
            )}

            {/* 8. Course FAQ, then the global FAQ */}
            {course.faqs.length > 0 && (
              <div>
                <h2 className="h3 mb-4">{t("faqTitle")}</h2>
                <FaqAccordion faqs={course.faqs} locale={locale} />
              </div>
            )}
            {globalFaqs.length > 0 && (
              <div>
                {/* The global FAQ follows the course-specific one without a
                    second heading when both are present. */}
                {course.faqs.length === 0 && (
                  <h2 className="h3 mb-4">{t("faqTitle")}</h2>
                )}
                <FaqAccordion faqs={globalFaqs} locale={locale} />
              </div>
            )}
          </div>

          {/* 3. Fee card */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <FeeCard course={course} locale={locale} />

            <div className="mt-4 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen
                  className="size-4 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                {t("eligibilityTitle")}
              </div>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                {pick(
                  locale,
                  "ন্যূনতম যোগ্যতা MBBS বা সমমান। ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন।",
                  "Minimum qualification: MBBS or equivalent. Intern doctors can also apply.",
                )}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Button asChild variant="accent" size="cta">
                  <Link href={`/apply?course=${course.slug}`}>
                    {common("applyNow")}
                  </Link>
                </Button>
                <Button asChild variant="whatsapp" size="cta">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="size-4" />
                    {common("whatsappShort")}
                  </a>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </Section>

      {/* 9. Related courses */}
      {relatedCourses.length > 0 && (
        <Section soft className="pb-28 md:pb-16">
          <h2 className="h2 mb-6">{t("relatedTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCourses.map((other) => (
              <CourseCard
                key={other.id}
                course={other}
                locale={locale}
                settings={settings}
              />
            ))}
          </div>
        </Section>
      )}

      {/* 10. Sticky bottom bar on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-white/95 p-3 backdrop-blur md:hidden print:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-[color:var(--muted-foreground)]">
              {coursesT("courseFee")}
            </p>
            <p className="nums truncate text-sm font-bold text-[color:var(--brand)]">
              {fee}
            </p>
          </div>
          <Button asChild variant="accent" size="cta">
            <Link href={`/apply?course=${course.slug}`}>{common("applyNow")}</Link>
          </Button>
          <Button
            asChild
            variant="whatsapp"
            size="icon-cta"
            aria-label={common("whatsapp")}
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" />
            </a>
          </Button>
        </div>
      </div>

      <CourseJsonLd
        course={course}
        locale={locale}
        settings={settings}
        url={`${siteUrl}${locale === "bn" ? "" : "/en"}/courses/${course.slug}`}
      />
    </>
  );
}

function ClassTile({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-4 text-center ${
        emphasis
          ? "border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)]"
          : "border-[color:var(--border)] bg-white"
      }`}
    >
      <dd className="nums text-2xl font-bold text-[color:var(--brand)]">{value}</dd>
      <dt className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{label}</dt>
    </div>
  );
}

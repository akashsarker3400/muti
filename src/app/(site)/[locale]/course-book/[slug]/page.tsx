import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Download,
  GraduationCap,
  Ruler,
  Stethoscope,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BookSampleForm } from "@/components/site/book-sample-form";
import { CourseCard } from "@/components/site/course-card";
import { WhatsAppIcon } from "@/components/site/icons";
import { BookJsonLd, BreadcrumbJsonLd } from "@/components/site/json-ld";
import { RichText } from "@/components/site/rich-text";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { localizedPath, pageAlternates, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { pick, toBanglaDigits } from "@/lib/format";
import {
  getCourseBook,
  getNextBatchByCourse,
  getPublishedCourses,
} from "@/lib/queries";
import { isEmptyRichText } from "@/lib/sanitize";
import { getSiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";
import { cn } from "cn";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [book, t] = await Promise.all([
    getCourseBook(slug),
    getTranslations({ locale, namespace: "book" }),
  ]);
  if (!book) return {};
  const path = `/course-book/${slug}`;
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: pageAlternates(locale, path),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      ...(book.coverImage ? { images: [{ url: book.coverImage }] } : {}),
    },
  };
}

/**
 * Course book page (addendum 5, A3): a clean product page. Cover, chapter
 * list, what you get, who it is for, the sample chapter form and the
 * admission CTA. Returns 404 while the book is unpublished.
 */
export default async function CourseBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ sample?: string }>;
}) {
  const [{ locale, slug }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [book, settings, courses, batches, t, common, nav] = await Promise.all([
    getCourseBook(slug),
    getSiteSettings(),
    getPublishedCourses(),
    getNextBatchByCourse(),
    getTranslations("book"),
    getTranslations("common"),
    getTranslations("nav"),
  ]);
  if (!book) notFound();

  const digits = (value: number | string) =>
    locale === "bn" ? toBanglaDigits(String(value)) : String(value);
  const linkedIds = new Set(book.courses.map((link) => link.courseId));
  const linkedCourses = courses.filter((course) => linkedIds.has(course.id));
  const ctaCourses = linkedCourses
    .filter((course) => course.code !== "ADMU")
    .slice(0, 3);
  const description = pick(locale, book.descriptionBn, book.description);
  const sampleChapter = book.chapters.find((chapter) => chapter.isSample);
  const sampleTitle =
    book.sampleChapterTitle ||
    (sampleChapter
      ? `${digits(String(sampleChapter.number).padStart(2, "0"))}: ${pick(locale, sampleChapter.titleBn, sampleChapter.title)}`
      : t("sampleChapterDefault"));
  const path = `/course-book/${book.slug}`;

  const perks = [
    { icon: Ruler, text: t("get1") },
    { icon: Stethoscope, text: t("get2") },
    { icon: ClipboardList, text: t("get3") },
    { icon: GraduationCap, text: t("get4") },
  ];

  return (
    <>
      {/* ---- 1. Hero ---------------------------------------------------- */}
      <section className="bg-[color:var(--bg-soft)] py-10 sm:py-14">
        <div className="container-content grid items-center gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-14">
          <div className="flex justify-center lg:justify-start">
            <BookCover src={book.coverImage} title={book.title} />
          </div>
          <div className="text-center lg:text-start">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="h1 mt-2">
              {book.title}
              {book.subtitle && (
                <span className="mt-1 block text-[0.6em] font-semibold text-[color:var(--muted-foreground)]">
                  {book.subtitle}
                </span>
              )}
            </h1>
            <p className="mt-3 font-medium">{t("levelLine")}</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              <Badge>
                {t("chaptersBadge", { count: digits(book.chapters.length) })}
              </Badge>
              {book.pages && (
                <Badge>{t("pagesBadge", { count: digits(book.pages) })}</Badge>
              )}
              <Badge>{book.priceNote || t("includedBadge")}</Badge>
            </ul>
            {description && !isEmptyRichText(description) ? (
              <RichText
                html={description}
                className="mt-5 text-[1.0625rem] text-[color:var(--muted-foreground)]"
              />
            ) : (
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-[color:var(--muted-foreground)]">
                {t("intro")}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button asChild variant="accent" size="cta-lg">
                <a href="#sample">
                  <Download className="size-5" aria-hidden="true" />
                  {t("downloadSample")}
                </a>
              </Button>
              <Button asChild variant="brandOutline" size="cta-lg">
                <Link href="/courses">
                  {t("viewCourses")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 2. Chapters ------------------------------------------------ */}
      <Section>
        <SectionHeading
          title={t("chaptersTitle")}
          subtitle={t("chaptersSubtitle", { count: digits(book.chapters.length) })}
        />
        <ol className="grid gap-3 md:grid-cols-2" data-testid="book-chapters">
          {book.chapters.map((chapter) => (
            <li
              key={chapter.id}
              className="flex gap-4 rounded-[14px] border border-[color:var(--border)] bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color:var(--brand)] font-latin text-sm font-bold text-white">
                {String(chapter.number).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {pick(locale, chapter.titleBn, chapter.title)}
                  </h3>
                  {chapter.isSample && (
                    <span className="rounded-full bg-[color:var(--success)]/12 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--success)]">
                      {t("freeSample")}
                    </span>
                  )}
                </div>
                {chapter.summary && (
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                    {chapter.summary}
                  </p>
                )}
                {chapter.topics.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {chapter.topics.map((topic) => (
                      <li
                        key={topic}
                        className="rounded-full bg-[color:var(--bg-soft)] px-2.5 py-0.5 text-xs text-[color:var(--muted-foreground)]"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---- 3. What you get + 4. Who it is for --------------------------- */}
      <Section soft>
        <SectionHeading title={t("whatYouGetTitle")} align="center" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex flex-col items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-5 text-center shadow-[var(--shadow-card)]"
            >
              <span className="grid size-12 place-items-center rounded-full bg-[#eef2fa] text-[color:var(--brand)]">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="font-medium">{text}</span>
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <h2 className="h3">{t("whoTitle")}</h2>
          <p className="mt-2 text-[color:var(--muted-foreground)]">{t("whoBody")}</p>
        </div>
      </Section>

      {/* ---- 5. Sample chapter form -------------------------------------- */}
      <Section id="sample">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            title={t("sampleTitle")}
            subtitle={t("sampleSubtitle", { chapter: sampleTitle })}
            align="center"
          />
          {book.samplePdfFileId ? (
            <BookSampleForm
              slug={book.slug}
              courses={linkedCourses.map((course) => ({
                id: course.id,
                label: pick(locale, course.nameBn, course.nameEn),
              }))}
              whatsapp={settings.contact.whatsapp}
              turnstileSiteKey={settings.security.turnstileSiteKey}
            />
          ) : (
            <p className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-white p-6 text-center text-[color:var(--muted-foreground)]">
              {t("unavailable")}
            </p>
          )}
        </div>
      </Section>

      {/* ---- 6. CTA ------------------------------------------------------ */}
      {ctaCourses.length > 0 && (
        <Section soft>
          <SectionHeading
            title={t("ctaTitle")}
            subtitle={t("ctaSubtitle")}
            align="center"
          />
          <div
            className={cn(
              "grid gap-4 sm:grid-cols-2",
              ctaCourses.length > 2 && "lg:grid-cols-3",
            )}
          >
            {ctaCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                locale={locale}
                settings={settings}
                batch={batches.get(course.id)}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="whatsapp" size="cta-lg">
              <a
                href={waLink(settings.contact.whatsapp, t("whatsappCta"))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-5" />
                {common("whatsapp")}
              </a>
            </Button>
          </div>
        </Section>
      )}

      <BookJsonLd book={book} settings={settings} path={localizedPath(locale, path)} />
      <BreadcrumbJsonLd
        items={[
          { name: nav("home"), url: `${siteUrl}${localizedPath(locale, "/")}` },
          {
            name: nav("courses"),
            url: `${siteUrl}${localizedPath(locale, "/courses")}`,
          },
          { name: book.title, url: `${siteUrl}${localizedPath(locale, path)}` },
        ]}
      />
    </>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-[color:var(--border)] bg-white px-3.5 py-1.5 text-sm font-medium shadow-[var(--shadow-card)]">
      {children}
    </li>
  );
}

/** The cover with a 3D tilt on hover; a branded placeholder until it is uploaded. */
function BookCover({ src, title }: { src: string | null; title: string }) {
  return (
    <div className="book-cover-scene" data-testid="book-cover">
      <div className="book-cover">
        {src ? (
          <Image
            src={src}
            alt={title}
            width={320}
            height={450}
            priority
            sizes="(min-width: 1024px) 320px, 220px"
            className="h-auto w-[220px] rounded-lg object-cover lg:w-[320px]"
          />
        ) : (
          <div className="flex aspect-[32/45] w-[220px] flex-col items-center justify-center gap-3 rounded-lg bg-[color:var(--brand)] p-6 text-center text-white lg:w-[320px]">
            <BookOpen className="size-12" aria-hidden="true" />
            <span className="text-xl font-bold">{title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

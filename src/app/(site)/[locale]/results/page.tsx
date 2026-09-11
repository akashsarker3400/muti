import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { ResultsSearch } from "@/components/site/results-search";
import { RichText } from "@/components/site/rich-text";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getResults } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { parseSubjectCodes } from "@/lib/verify";
import { waLink } from "@/lib/whatsapp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "results" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "bn" ? "/results" : "/en/results" },
  };
}

async function getPublishedBoardExams() {
  try {
    return await prisma.boardExam.findMany({
      where: { published: true },
      include: { course: { select: { nameBn: true, nameEn: true } } },
      orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("getPublishedBoardExams failed", error);
    return [];
  }
}

/**
 * Result search (addendum 3, §2) plus the browsable list of board notices,
 * then the office's own result notices (the older `Result` rows) below.
 */
export default async function ResultsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [exams, results, settings, t] = await Promise.all([
    getPublishedBoardExams(),
    getResults(),
    getSiteSettings(),
    getTranslations("results"),
  ]);

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    pick(
      locale,
      settings.whatsapp.defaultMessageBn,
      settings.whatsapp.defaultMessageEn,
    ),
  );

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <ResultsSearch
          locale={locale}
          exams={exams.map((exam) => ({
            id: exam.id,
            label: `${exam.title} — ${exam.session}`,
          }))}
          subjectCodes={parseSubjectCodes(settings.results.subjectCodes)}
          turnstileSiteKey={settings.security.turnstileSiteKey}
          whatsappHref={whatsappHref}
        />
      </Section>

      {exams.length > 0 && (
        <Section soft>
          <SectionHeading title={t("boardExamsTitle")} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-col rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)]"
              >
                <h3 className="font-latin text-base font-semibold">{exam.title}</h3>
                <p className="mt-1 font-latin text-sm text-[color:var(--muted-foreground)]">
                  {[
                    exam.course
                      ? pick(locale, exam.course.nameBn, exam.course.nameEn)
                      : null,
                    exam.session,
                    exam.heldIn,
                    exam.publishedOn ? formatDate(exam.publishedOn, locale) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {exam.noticeFile && (
                  <Button
                    asChild
                    variant="brandOutline"
                    size="cta"
                    className="mt-4 self-start"
                  >
                    <a href={exam.noticeFile} target="_blank" rel="noopener noreferrer">
                      <Download className="size-4" aria-hidden="true" />
                      {t("downloadNotice")}
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {results.length > 0 && (
        <Section>
          <SectionHeading title={t("noticesTitle")} />
          <ul className="space-y-4">
            {results.map((result) => (
              <li
                key={result.id}
                className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <FileText
                        className="size-4 text-[color:var(--brand)]"
                        aria-hidden="true"
                      />
                      {result.title}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                      {[
                        result.course
                          ? pick(locale, result.course.nameBn, result.course.nameEn)
                          : null,
                        result.batch?.name ?? null,
                        result.examDate
                          ? `${t("examDate")}: ${formatDate(result.examDate, locale)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {result.fileUrl && (
                    <Button asChild variant="brandOutline" size="cta">
                      <a
                        href={result.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-4" aria-hidden="true" />
                        {t("downloadPdf")}
                      </a>
                    </Button>
                  )}
                </div>
                {result.bodyHtml && (
                  <div className="mt-4 overflow-x-auto">
                    <RichText html={result.bodyHtml} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

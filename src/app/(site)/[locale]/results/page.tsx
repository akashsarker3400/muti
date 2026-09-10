import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import { getResults } from "@/lib/queries";

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

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [results, t, verify] = await Promise.all([
    getResults(),
    getTranslations("results"),
    getTranslations("verify"),
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")}>
        {/*
          Roll lookup is handled by the certificate verification page, which
          already has the rate limiting and name masking (section 5.12).
        */}
        <Button asChild variant="brandOutline" size="cta">
          <Link href="/verify">{verify("title")}</Link>
        </Button>
      </PageHero>

      <Section>
        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-4">
            {results.map((result) => (
              <li
                key={result.id}
                className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{result.title}</h2>
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
        )}
      </Section>
    </>
  );
}

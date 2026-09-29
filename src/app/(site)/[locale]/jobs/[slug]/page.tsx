import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Briefcase, CalendarClock, MapPin } from "lucide-react";

import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageAlternates, type Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import { getJobBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return {};
  return {
    title: `${job.title} — ${job.organization}`,
    alternates: pageAlternates(locale, `/jobs/${slug}`),
  };
}

/** One job (addendum 2, B11). */
export default async function JobPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [t, common, job] = await Promise.all([
    getTranslations("jobs"),
    getTranslations("common"),
    getJobBySlug(slug),
  ]);
  if (!job) notFound();

  return (
    <Section>
      <article className="mx-auto max-w-3xl">
        <h1 className="h1">{job.title}</h1>
        <p className="mt-1 text-lg text-[color:var(--muted-foreground)]">
          {job.organization}
        </p>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li className="flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {job.location}
          </li>
          <li className="flex items-center gap-1">
            <Briefcase className="size-4" aria-hidden="true" />
            {t(`type.${job.type}`)}
          </li>
          {job.deadline && (
            <li className="flex items-center gap-1">
              <CalendarClock className="size-4" aria-hidden="true" />
              {t("closes")}: {formatDate(job.deadline, locale)}
            </li>
          )}
          {job.salary && <li className="font-medium">{job.salary}</li>}
        </ul>

        <RichText
          html={pick(locale, job.descriptionBn, job.descriptionEn)}
          className="mt-6"
        />

        <div className="mt-8 rounded-2xl bg-[color:var(--bg-soft)] p-5">
          <h2 className="font-semibold">{t("howToApply")}</h2>
          <p className="mt-1 whitespace-pre-line">{job.contact}</p>
          {job.applyUrl && (
            <Button asChild variant="brand" size="cta" className="mt-4">
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                {t("apply")}
              </a>
            </Button>
          )}
        </div>

        <Button asChild variant="outline" size="cta" className="mt-10">
          <Link href="/jobs">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {common("back")}
          </Link>
        </Button>
      </article>
    </Section>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Briefcase, CalendarClock, MapPin } from "lucide-react";

import { Section } from "@/components/site/section";
import { Link } from "@/i18n/navigation";
import { pageAlternates, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { getJobs } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "jobs" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/jobs"),
  };
}

/**
 * The job board (addendum 2, B11).
 *
 * Sonographers here are hired by word of mouth, and this is the institute
 * putting its word where its graduates can see it. A job past its deadline is
 * not listed at all: applying for a post that closed last month wastes the
 * applicant's day and the employer's patience.
 */
export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, jobs] = await Promise.all([getTranslations("jobs"), getJobs()]);

  return (
    <Section>
      <h1 className="h1">{t("title")}</h1>
      <p className="mt-2 max-w-prose text-[color:var(--muted-foreground)]">
        {t("subtitle")}
      </p>

      {jobs.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-[color:var(--border)] p-10 text-center text-[color:var(--muted-foreground)]">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.slug}`}
                className="block h-full rounded-2xl border border-[color:var(--border)] bg-white p-5 transition hover:border-[color:var(--brand)]"
              >
                <h2 className="text-lg font-semibold">{job.title}</h2>
                <p className="text-[color:var(--muted-foreground)]">
                  {job.organization}
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--muted-foreground)]">
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
                </ul>
                {job.salary && (
                  <p className="mt-2 text-sm font-medium">{job.salary}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

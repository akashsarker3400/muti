import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdmissionForm } from "@/components/site/forms/admission-form";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getPublishedCourses, getUpcomingBatches } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { pageAlternates } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apply" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/apply"),
  };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, courses, batches, t] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getUpcomingBatches(),
    getTranslations("apply"),
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <div className="max-w-3xl">
          {/* useSearchParams inside the form needs a Suspense boundary. */}
          <Suspense fallback={<Skeleton className="h-[40rem] w-full rounded-[14px]" />}>
            <AdmissionForm
              courses={courses.map((course) => ({
                id: course.id,
                slug: course.slug,
                label: `${pick(locale, course.nameBn, course.nameEn)} — ${pick(locale, course.fullNameBn, course.fullNameEn)}`,
              }))}
              batches={batches.map((batch) => ({
                id: batch.id,
                label: batch.name,
              }))}
              whatsappNumber={settings.contact.whatsapp}
            />
          </Suspense>
        </div>
      </Section>
    </>
  );
}

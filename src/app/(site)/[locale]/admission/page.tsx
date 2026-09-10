import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditCard, Download, GraduationCap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DocumentsList } from "@/components/site/documents-list";
import { AdmissionForm } from "@/components/site/forms/admission-form";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/routing";
import { admissionRequirement, localize, paymentPolicy } from "@/lib/content";
import { pick } from "@/lib/format";
import { getDownloads, getPublishedCourses, getUpcomingBatches } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admission" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "bn" ? "/admission" : "/en/admission" },
  };
}

export default async function AdmissionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, courses, batches, downloads, t] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getUpcomingBatches(),
    getDownloads(),
    getTranslations("admission"),
  ]);

  const steps = [
    { title: t("step1"), body: t("step1Body") },
    { title: t("step2"), body: t("step2Body") },
    { title: t("step3"), body: t("step3Body") },
    { title: t("step4"), body: t("step4Body") },
  ];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex items-center gap-2.5">
              <GraduationCap
                className="size-5 text-[color:var(--brand)]"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">{t("eligibilityTitle")}</h2>
            </div>
            <p className="mt-3 leading-relaxed">
              {localize(admissionRequirement, locale)}
            </p>
          </div>

          <div className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex items-center gap-2.5">
              <CreditCard
                className="size-5 text-[color:var(--brand)]"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">{t("paymentTitle")}</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {paymentPolicy.map((item) => (
                <li key={item.en} className="flex gap-2">
                  <span aria-hidden="true" className="text-[color:var(--brand)]">
                    •
                  </span>
                  <span>{localize(item, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <DocumentsList locale={locale} />
        </div>
      </Section>

      <Section soft>
        <SectionHeading title={t("stepsTitle")} />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <span
                aria-hidden="true"
                className="nums grid size-9 place-items-center rounded-full bg-[color:var(--brand)] text-sm font-bold text-white"
              >
                {locale === "bn" ? ["১", "২", "৩", "৪"][index] : String(index + 1)}
              </span>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {downloads.length > 0 && (
        <Section>
          <SectionHeading title={t("downloadsTitle")} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {downloads.map((file) => (
              <li key={file.id}>
                <Button
                  asChild
                  variant="outline"
                  size="cta"
                  className="h-auto w-full justify-start py-3 text-start"
                >
                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{file.title}</span>
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section soft id="apply">
        <SectionHeading title={t("formTitle")} />
        <div className="max-w-3xl">
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

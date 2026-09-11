import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditCard, FileText, GraduationCap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DocumentsList } from "@/components/site/documents-list";
import { AdmissionForm } from "@/components/site/forms/admission-form";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHeading } from "@/components/site/section";
import { FileViewer } from "@/components/site/file-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content-items";
import { pick } from "@/lib/format";
import { getDownloads, getPublishedCourses, getUpcomingBatches } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { pageAlternates } from "@/i18n/routing";

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
    alternates: pageAlternates(locale, "/admission"),
  };
}

export default async function AdmissionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, courses, batches, downloads, paymentPolicy, steps, t] =
    await Promise.all([
      getSiteSettings(),
      getPublishedCourses(),
      getUpcomingBatches(),
      getDownloads(),
      getContent("PAYMENT_POLICY", locale),
      getContent("ADMISSION_STEP", locale),
      getTranslations("admission"),
    ]);

  const eligibility = pick(
    locale,
    settings.content.eligibilityBn,
    settings.content.eligibilityEn,
  );

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
            <p className="mt-3 leading-relaxed">{eligibility}</p>
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
                <li key={item.id} className="flex gap-2">
                  <span aria-hidden="true" className="text-[color:var(--brand)]">
                    •
                  </span>
                  <span>{item.body}</span>
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
              key={step.id}
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
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-3 shadow-[var(--shadow-card)]"
              >
                <FileText
                  className="size-5 shrink-0 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {file.title}
                </span>
                <FileViewer url={file.fileUrl} title={file.title} compact />
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
                label: `${pick(locale, course.nameBn, course.nameEn)}: ${pick(locale, course.fullNameBn, course.fullNameEn)}`,
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

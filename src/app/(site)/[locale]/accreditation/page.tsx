import type { Metadata } from "next";
import { Award, BadgeCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { PartnersRow } from "@/components/site/partners-row";
import { Section, SectionHeading } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content-items";
import { toBanglaDigits } from "@/lib/format";
import { getPartners } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accreditation" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: locale === "en" ? "/accreditation" : "/bn/accreditation",
    },
  };
}

export default async function AccreditationPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, partners, certificates, t] = await Promise.all([
    getSiteSettings(),
    getPartners(),
    getContent("CERTIFICATE", locale),
    getTranslations("accreditation"),
  ]);

  const govtCode =
    locale === "bn"
      ? toBanglaDigits(settings.general.govtCode)
      : settings.general.govtCode;

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        {/*
          The headline claim is exactly "Government approved institute, Code
          57125" (section 3). We deliberately do not use the phrase
          "International Accreditation" anywhere on the site.
        */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[color:var(--brand)]/15 bg-[color:var(--brand-soft)] p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-[color:var(--brand)] text-white">
            <BadgeCheck className="size-7" aria-hidden="true" />
          </span>
          <p className="eyebrow">{t("codeTitle")}</p>
          <p className="nums font-latin text-4xl font-bold text-[color:var(--brand)]">
            {govtCode}
          </p>
          <p className="max-w-xl text-[color:var(--muted-foreground)]">
            {locale === "bn"
              ? "MUTI বাংলাদেশ সরকার অনুমোদিত একটি প্রশিক্ষণ প্রতিষ্ঠান। প্রতিষ্ঠান কোড ৫৭১২৫। বাংলাদেশ টেকনিক্যাল এডুকেশন বোর্ড (BTEB), শিক্ষা মন্ত্রণালয়, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার-এর সাথে অনুমোদিত।"
              : "MUTI is a training institute approved by the Government of Bangladesh, institute code 57125, with affiliation to the Bangladesh Technical Education Board (BTEB), Ministry of Education, Government of the People's Republic of Bangladesh."}
          </p>
        </div>
      </Section>

      <PartnersRow partners={partners} showGroups soft />

      {certificates.length > 0 && (
        <Section>
          <SectionHeading title={t("certificatesTitle")} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {certificates.map((certificate) => (
              <li
                key={certificate.id}
                className="flex items-start gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-4 shadow-[var(--shadow-card)]"
              >
                <Award
                  className="mt-0.5 size-5 shrink-0 text-[color:var(--highlight)]"
                  aria-hidden="true"
                />
                <span className="font-medium">{certificate.body}</span>
              </li>
            ))}
          </ul>

          {/*
            Approval document images (e.g. the BTEB letter) are only shown once
            an admin uploads them under Gallery or Downloads — never the
            owner's personal documents (section 1). See HANDOVER.md.
          */}
        </Section>
      )}
    </>
  );
}

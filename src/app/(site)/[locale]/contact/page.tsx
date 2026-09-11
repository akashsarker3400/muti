import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactStrip } from "@/components/site/contact-strip";
import { ContactForm } from "@/components/site/forms/contact-form";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHeading } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "en" ? "/contact" : "/bn/contact" },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, t] = await Promise.all([
    getSiteSettings(),
    getTranslations("contact"),
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <ContactStrip settings={settings} locale={locale} soft={false} />

      <Section soft>
        <SectionHeading title={t("formTitle")} />
        <div className="max-w-2xl">
          <ContactForm />
        </div>
      </Section>
    </>
  );
}

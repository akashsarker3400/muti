import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FaqAccordion } from "@/components/site/faq-accordion";
import { FaqJsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getGlobalFaqs } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "en" ? "/faq" : "/bn/faq" },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [faqs, t] = await Promise.all([getGlobalFaqs(), getTranslations("faq")]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <div className="max-w-3xl">
          {faqs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
              {t("empty")}
            </p>
          ) : (
            <FaqAccordion faqs={faqs} locale={locale} />
          )}
        </div>
      </Section>

      <FaqJsonLd
        items={faqs.map((faq) => ({
          question: pick(locale, faq.questionBn, faq.questionEn),
          answer: pick(locale, faq.answerBn, faq.answerEn),
        }))}
      />
    </>
  );
}

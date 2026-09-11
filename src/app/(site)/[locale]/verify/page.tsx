import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { VerifyForm } from "@/components/site/verify-form";
import { CertificateCard, LookupNotice } from "@/components/site/verify-result";
import { verifyByToken } from "@/app/actions/verify";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getSiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

type Search = Promise<{ t?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Search;
}): Promise<Metadata> {
  const [{ locale }, { t: token }] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "verify" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "bn" ? "/verify" : "/en/verify" },
    // The empty page is indexable; a result state is one person's record.
    robots: token ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Search;
}) {
  const [{ locale }, { t: token }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [t, settings] = await Promise.all([
    getTranslations("verify"),
    getSiteSettings(),
  ]);
  const whatsappHref = waLink(
    settings.contact.whatsapp,
    pick(
      locale,
      settings.whatsapp.defaultMessageBn,
      settings.whatsapp.defaultMessageEn,
    ),
  );

  // QR code on the certificate: /verify?t=<token> answers without a form.
  const fromToken = token ? await verifyByToken(token) : null;

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {token && (
          <div className="mx-auto mb-8 max-w-2xl" data-testid="verify-token-result">
            {fromToken ? (
              <CertificateCard certificate={fromToken} locale={locale} />
            ) : (
              <LookupNotice
                tone="warning"
                title={t("notFound")}
                whatsappHref={whatsappHref}
              />
            )}
          </div>
        )}
        <VerifyForm
          locale={locale}
          turnstileSiteKey={settings.security.turnstileSiteKey}
          whatsappHref={whatsappHref}
        />
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdvisorGrid } from "@/components/site/advisor-grid";
import { toCard } from "@/components/site/advisors-section";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { getAdvisors } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { parseAdvisorCategories } from "@/lib/verify";
import { pageAlternates } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "advisors" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/advisors"),
  };
}

/** Advisory board grouped by category (addendum 3, §5). */
export default async function AdvisorsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [advisors, settings, t] = await Promise.all([
    getAdvisors(),
    getSiteSettings(),
    getTranslations("advisors"),
  ]);

  const categories = parseAdvisorCategories(settings.advisors.categories);
  const known = new Set(categories.map((c) => c.key));
  // Categories the settings do not name still show, after the named ones.
  const extra = [
    ...new Set(advisors.map((a) => a.category).filter((k) => !known.has(k))),
  ].map((key) => ({ key, labelBn: key, labelEn: key }));
  const groups = [...categories, ...extra]
    .map((category) => ({
      ...category,
      members: advisors.filter((a) => a.category === category.key),
    }))
    .filter((group) => group.members.length > 0);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      {groups.length === 0 ? (
        <Section>
          <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
            {t("empty")}
          </p>
        </Section>
      ) : (
        groups.map((group, index) => (
          <Section key={group.key} soft={index % 2 === 1}>
            {groups.length > 1 && (
              <h2 className="mb-6 text-center text-xl font-semibold text-[color:var(--brand)]">
                {locale === "bn" ? group.labelBn : group.labelEn}
              </h2>
            )}
            <AdvisorGrid advisors={group.members.map((a) => toCard(a, locale))} />
          </Section>
        ))
      )}
    </>
  );
}

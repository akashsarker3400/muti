import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FacultyCard } from "@/components/site/faculty-card";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { getFaculty } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faculty" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "en" ? "/faculty" : "/bn/faculty" },
  };
}

export default async function FacultyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [faculty, t] = await Promise.all([getFaculty(), getTranslations("faculty")]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {faculty.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
            {t("empty")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {faculty.map((member) => (
              <FacultyCard key={member.id} member={member} locale={locale} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

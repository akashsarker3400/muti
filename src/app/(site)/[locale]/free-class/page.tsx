import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FreeClassForm } from "@/components/site/forms/free-class-form";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getPublishedCourses } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freeClass" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "en" ? "/free-class" : "/bn/free-class" },
  };
}

export default async function FreeClassPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, courses, t] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getTranslations("freeClass"),
  ]);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <div className="max-w-2xl">
          <FreeClassForm
            courses={courses.map((course) => ({
              id: course.id,
              slug: course.slug,
              label: pick(locale, course.nameBn, course.nameEn),
            }))}
            whatsappNumber={settings.contact.whatsapp}
          />
        </div>
      </Section>
    </>
  );
}

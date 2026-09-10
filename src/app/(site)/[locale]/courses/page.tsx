import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CourseCard } from "@/components/site/course-card";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPublishedCourses } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { cn } from "cn";

const LEVELS = ["ALL", "CERTIFICATE", "DIPLOMA", "SPECIAL"] as const;
type LevelFilter = (typeof LEVELS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "courses" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "bn" ? "/courses" : "/en/courses" },
  };
}

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const [{ locale }, { level }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [settings, courses, t, levels] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getTranslations("courses"),
    getTranslations("levels"),
  ]);

  const active: LevelFilter = LEVELS.includes(level as LevelFilter)
    ? (level as LevelFilter)
    : "ALL";

  const visible =
    active === "ALL" ? courses : courses.filter((course) => course.level === active);

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        {/* Filter chips (section 5.3). Plain links keep this working
            without JavaScript and make each filter shareable. */}
        <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("title")}>
          {LEVELS.map((option) => {
            const count =
              option === "ALL"
                ? courses.length
                : courses.filter((course) => course.level === option).length;
            if (count === 0 && option !== "ALL") return null;

            return (
              <Link
                key={option}
                href={option === "ALL" ? "/courses" : `/courses?level=${option}`}
                aria-current={option === active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition",
                  option === active
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                    : "border-[color:var(--border)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--brand)]/40 hover:bg-[color:var(--bg-soft)]",
                )}
              >
                {option === "ALL" ? t("filterAll") : levels(option)}
              </Link>
            );
          })}
        </nav>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
            {t("empty")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                locale={locale}
                settings={settings}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

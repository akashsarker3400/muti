import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { NoticeList } from "@/components/site/notice-list";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { countNotices, getNotices } from "@/lib/queries";
import { cn } from "cn";
import { pageAlternates } from "@/i18n/routing";

const PAGE_SIZE = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notices" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/notices"),
  };
}

export default async function NoticesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ locale }, { page }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const current = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const [notices, total, t, common] = await Promise.all([
    getNotices({ take: PAGE_SIZE, skip: (current - 1) * PAGE_SIZE }),
    countNotices(),
    getTranslations("notices"),
    getTranslations("common"),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <NoticeList notices={notices} locale={locale} />

        {pages > 1 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            aria-label={common("page")}
          >
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <Link
                key={number}
                href={number === 1 ? "/notices" : `/notices?page=${number}`}
                aria-current={number === current ? "page" : undefined}
                className={cn(
                  "nums grid min-h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-medium transition",
                  number === current
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                    : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
                )}
              >
                {formatNumber(number, locale)}
              </Link>
            ))}
          </nav>
        )}
      </Section>
    </>
  );
}

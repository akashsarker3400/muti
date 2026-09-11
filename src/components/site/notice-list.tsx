import { ArrowRight, Pin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import type { getNotices } from "@/lib/queries";

type Notice = Awaited<ReturnType<typeof getNotices>>[number];

const CATEGORY_STYLES: Record<string, string> = {
  ADMISSION: "bg-[color:var(--accent-red)]/10 text-[color:var(--accent-red-ink)]",
  EXAM: "bg-[color:var(--brand)]/10 text-[color:var(--brand)]",
  RESULT: "bg-[color:var(--success)]/12 text-[color:var(--success-ink)]",
  HOLIDAY: "bg-[color:var(--warning)]/12 text-[color:var(--warning-ink)]",
  GENERAL: "bg-[color:var(--bg-soft)] text-[color:var(--muted-foreground)]",
};

export async function NoticeList({
  notices,
  locale,
}: {
  notices: Notice[];
  locale: Locale;
}) {
  const [t, categories, common] = await Promise.all([
    getTranslations("notices"),
    getTranslations("noticeCategory"),
    getTranslations("common"),
  ]);

  if (notices.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-6 text-center text-sm text-[color:var(--muted-foreground)]">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]">
      {notices.map((notice) => (
        <li key={notice.id}>
          <Link
            href={`/notices/${notice.slug}`}
            className="group flex items-start gap-4 p-4 transition hover:bg-[color:var(--bg-soft)] sm:p-5"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    CATEGORY_STYLES[notice.category] ?? CATEGORY_STYLES.GENERAL
                  }`}
                >
                  {categories(notice.category)}
                </span>
                {notice.pinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--accent-red-ink)]">
                    <Pin className="size-3" aria-hidden="true" />
                    {t("pinned")}
                  </span>
                )}
                <time
                  dateTime={notice.publishedAt.toISOString()}
                  className="text-[11px] text-[color:var(--muted-foreground)]"
                >
                  {formatDate(notice.publishedAt, locale)}
                </time>
              </div>

              <p className="leading-snug font-medium text-[color:var(--foreground)] group-hover:text-[color:var(--brand)]">
                {pick(locale, notice.titleBn, notice.titleEn)}
              </p>
            </div>

            <ArrowRight
              className="mt-1 size-4 shrink-0 text-[color:var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--brand)] rtl:rotate-180"
              aria-hidden="true"
            />
            <span className="sr-only">{common("readMore")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

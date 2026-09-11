import { ArrowRight, Megaphone, Pin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import type { getNotices } from "@/lib/queries";

type Notice = Awaited<ReturnType<typeof getNotices>>[number];

/**
 * Seconds per character of scrolling text. Slow enough to read Bangla at a
 * glance, fast enough that a ten-notice loop finishes within a minute.
 */
const SECONDS_PER_CHAR = 0.28;
const MIN_DURATION = 18;

/**
 * News-channel style ticker under the header (homepage only). It reads the
 * same published, unexpired notices as the notice list — pinned first — so
 * the office manages it from the existing Notices screen; nothing new to
 * keep in sync.
 *
 * The scroll is a pure CSS marquee: the item list is rendered twice and the
 * track slides by exactly half its width, so the loop is seamless. The copy
 * is `aria-hidden` and hidden entirely under `prefers-reduced-motion`, where
 * the row becomes a plain horizontal scroller instead (see globals.css).
 */
export async function NoticeTicker({
  notices,
  locale,
}: {
  notices: Notice[];
  locale: Locale;
}) {
  if (notices.length === 0) return null;

  const [home, common] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
  ]);

  const items = notices.map((notice) => ({
    id: notice.id,
    slug: notice.slug,
    title: pick(locale, notice.titleBn, notice.titleEn),
    date: formatDate(notice.publishedAt, locale),
    pinned: notice.pinned,
  }));

  const characters = items.reduce((sum, item) => sum + item.title.length + 12, 0);
  const duration = Math.max(MIN_DURATION, Math.round(characters * SECONDS_PER_CHAR));

  return (
    <section
      aria-label={home("tickerLabel")}
      className="notice-ticker border-b border-[color:var(--border)] bg-white"
      data-testid="notice-ticker"
    >
      <div className="container-content flex items-stretch gap-0">
        <div className="z-10 flex shrink-0 items-center gap-1.5 bg-[color:var(--accent-red)] px-3 text-xs font-bold tracking-wide text-white uppercase sm:px-4 sm:text-[13px]">
          <Megaphone className="size-4" aria-hidden="true" />
          <span>{home("tickerLabel")}</span>
        </div>

        <div className="notice-ticker-viewport relative min-w-0 flex-1 overflow-hidden">
          <ul
            className="notice-ticker-track flex w-max items-center"
            style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}
          >
            <TickerItems items={items} />
            <TickerItems items={items} clone />
          </ul>
        </div>

        <Link
          href="/notices"
          className="hidden shrink-0 items-center gap-1 border-s border-[color:var(--border)] ps-3 pe-1 text-xs font-semibold text-[color:var(--brand)] hover:underline sm:flex"
        >
          {common("viewAll")}
          <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function TickerItems({
  items,
  clone = false,
}: {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    date: string;
    pinned: boolean;
  }>;
  clone?: boolean;
}) {
  return (
    <>
      {items.map((item) => (
        <li
          key={clone ? `${item.id}-clone` : item.id}
          aria-hidden={clone ? true : undefined}
          className={clone ? "notice-ticker-clone shrink-0" : "shrink-0"}
        >
          <Link
            href={`/notices/${item.slug}`}
            tabIndex={clone ? -1 : undefined}
            className="group flex items-center gap-2 py-2.5 ps-4 pe-6 text-sm whitespace-nowrap text-[color:var(--foreground)] hover:text-[color:var(--brand)]"
          >
            {item.pinned ? (
              <Pin
                className="size-3.5 shrink-0 text-[color:var(--accent-red)]"
                aria-hidden="true"
              />
            ) : (
              <span
                className="size-1.5 shrink-0 rounded-full bg-[color:var(--highlight)]"
                aria-hidden="true"
              />
            )}
            <span className="nav-text py-0 group-hover:underline">{item.title}</span>
            <span className="nums text-[13px] font-medium text-[color:var(--muted-foreground)]">
              {item.date}
            </span>
          </Link>
        </li>
      ))}
    </>
  );
}

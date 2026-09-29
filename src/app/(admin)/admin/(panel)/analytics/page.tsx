import Link from "next/link";

import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin-auth";
import { keyToIso } from "@/lib/health-schedule";
import { getSiteSettings } from "@/lib/site-settings";
import { visitorSummary } from "@/lib/visitors";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

/**
 * Who read the site (addendum 2, A6).
 *
 * Our own numbers, from our own database. No cookie, no third party, and no
 * banner: what is counted is a path, a day and a hash that changes every
 * night, which is why this page can exist at all without a privacy policy
 * argument.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const { days: daysParam } = await searchParams;

  const days = RANGES.includes(Number(daysParam) as 7) ? Number(daysParam) : 30;
  const [summary, settings] = await Promise.all([
    visitorSummary(days),
    getSiteSettings(),
  ]);

  const busiest = Math.max(1, ...summary.days.map((entry) => entry.views));
  const mobile =
    summary.devices.find((entry) => entry.device === "mobile")?.views ?? 0;
  const mobileShare =
    summary.totalViews > 0 ? Math.round((mobile / summary.totalViews) * 100) : 0;

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="How many people read the site, and what they read. Counted here on our own server: no cookie, no address stored, nothing sent to another company."
      />

      {!settings.integrations.visitorStats && (
        <Panel className="mb-4 text-sm">
          Visitor counting is switched off in{" "}
          <Link href="/admin/settings" className="underline">
            Site Settings → Integrations
          </Link>
          . Nothing new is being recorded.
        </Panel>
      )}

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Range">
        {RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/analytics?days=${range}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              range === days
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
            )}
          >
            Last {range} days
          </Link>
        ))}
      </nav>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Page views" value={summary.totalViews} />
        <StatCard
          label="Visitors"
          value={summary.totalVisitors}
          hint="Counted once per day each"
        />
        <StatCard label="On a phone" value={`${mobileShare}%`} />
      </div>

      {summary.totalViews === 0 ? (
        <EmptyState
          title="Nothing counted yet."
          description="Views appear here within a minute of somebody opening a page on the public site."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="lg:col-span-2">
            <h2 className="text-base font-semibold">Views per day</h2>
            {/* One bar per day the site was visited. Capped in width so a
                quiet week reads as a few bars rather than one wide wall. */}
            <ol className="mt-4 flex h-40 items-end gap-1">
              {summary.days.map((entry) => (
                <li
                  key={entry.day}
                  className="group relative max-w-10 flex-1"
                  style={{ height: `${Math.max(3, (entry.views / busiest) * 100)}%` }}
                  title={`${keyToIso(entry.day)}: ${entry.views} views, ${entry.visitors} visitors`}
                >
                  <span className="block size-full rounded-t bg-[color:var(--brand)] opacity-80 group-hover:opacity-100" />
                </li>
              ))}
            </ol>
            <div className="mt-2 flex justify-between font-latin text-xs text-[color:var(--muted-foreground)]">
              <span>{keyToIso(summary.days[0]?.day ?? "")}</span>
              <span>{keyToIso(summary.days.at(-1)?.day ?? "")}</span>
            </div>
          </Panel>

          <TopList
            title="Most read pages"
            rows={summary.pages.map((entry) => ({
              label: entry.path,
              value: entry.views,
            }))}
            latin
          />

          <TopList
            title="Where they came from"
            rows={summary.referrers.map((entry) => ({
              label: entry.host,
              value: entry.views,
            }))}
            empty="Everyone arrived directly or from a search engine that hides it."
            latin
          />

          <TopList
            title="Phone or computer"
            rows={summary.devices.map((entry) => ({
              label: entry.device === "mobile" ? "Phone" : "Computer",
              value: entry.views,
            }))}
          />

          <TopList
            title="Language"
            rows={summary.locales.map((entry) => ({
              label: entry.locale === "bn" ? "Bangla" : "English",
              value: entry.views,
            }))}
          />
        </div>
      )}
    </>
  );
}

function TopList({
  title,
  rows,
  empty,
  latin = false,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  empty?: string;
  latin?: boolean;
}) {
  const largest = Math.max(1, ...rows.map((row) => row.value));

  return (
    <Panel>
      <h2 className="text-base font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          {empty ?? "Nothing yet."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={cn("truncate", latin && "font-latin")}>
                  {row.label}
                </span>
                <span className="font-latin tabular-nums">{row.value}</span>
              </div>
              <span
                className="mt-1 block h-1.5 rounded-full bg-[color:var(--brand)] opacity-70"
                style={{ width: `${(row.value / largest) * 100}%` }}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

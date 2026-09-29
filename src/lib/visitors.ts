import "server-only";

import { createHash } from "node:crypto";

import { requiredEnv } from "@/lib/env";
import { dhakaDateKey } from "@/lib/health-schedule";
import { prisma } from "@/lib/prisma";

/**
 * First-party visitor statistics (addendum 2, A6).
 *
 * The office wants to know how many people looked at the CMU course page.
 * That question does not need Google Analytics, a cookie banner, or sending
 * a Bangladeshi doctor's browsing to a third country.
 *
 * What is stored: the path, the day, the language, the referring host and
 * whether the screen was a phone. What is not stored: the IP address, the
 * user agent, anything that survives to tomorrow. The `visitor` hash mixes
 * the address and the browser with the day and the application secret, so
 * two visits on the same day count as one person, and the same person
 * tomorrow is a different, unlinkable hash.
 */

export type VisitorHit = {
  path: string;
  locale?: string | null;
  referrer?: string | null;
  ip: string;
  userAgent: string;
};

/** Paths never counted: the admin panel, API routes and asset requests. */
const IGNORED = /^\/(admin|api|uploads|_next|favicon|robots|sitemap)/;

/** The obvious crawlers. Not a security control, just noise reduction. */
const BOT =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests/i;

export function isCountablePath(path: string): boolean {
  return path.startsWith("/") && !IGNORED.test(path);
}

export function isBot(userAgent: string): boolean {
  return userAgent === "" || BOT.test(userAgent);
}

/** Phone or desktop, from the user agent. Nothing finer is worth storing. */
export function deviceOf(userAgent: string): "mobile" | "desktop" {
  return /android|iphone|ipad|ipod|mobile|opera mini/i.test(userAgent)
    ? "mobile"
    : "desktop";
}

/** The referring host, or null for a direct visit or our own pages. */
export function referrerHostOf(referrer: string | null | undefined, self: string) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== self.replace(/^www\./, "") ? host : null;
  } catch {
    return null;
  }
}

/**
 * The daily-rotating visitor hash. Truncated to 16 characters: enough that a
 * collision is a rounding error on a site this size, short enough that the
 * column is not a fingerprint anybody could work back from.
 */
export function visitorHash(ip: string, userAgent: string, day: string): string {
  const secret = requiredEnv("AUTH_SECRET");
  return createHash("sha256")
    .update(`${secret}:${day}:${ip}:${userAgent}`)
    .digest("base64url")
    .slice(0, 16);
}

/** Records one view. Never throws: statistics must not break a page. */
export async function recordHit(hit: VisitorHit, selfHost: string): Promise<boolean> {
  if (!isCountablePath(hit.path) || isBot(hit.userAgent)) return false;

  const day = dhakaDateKey();
  try {
    await prisma.pageView.create({
      data: {
        day,
        // Query strings are where personal data hides, so only the path is kept.
        path: hit.path.split("?")[0]!.slice(0, 300),
        locale: hit.locale === "bn" ? "bn" : "en",
        referrerHost: referrerHostOf(hit.referrer, selfHost),
        device: deviceOf(hit.userAgent),
        visitor: visitorHash(hit.ip, hit.userAgent, day),
      },
    });
    return true;
  } catch (error) {
    console.error("Could not record a page view", error);
    return false;
  }
}

export type VisitorSummary = {
  days: Array<{ day: string; views: number; visitors: number }>;
  totalViews: number;
  totalVisitors: number;
  pages: Array<{ path: string; views: number }>;
  referrers: Array<{ host: string; views: number }>;
  devices: Array<{ device: string; views: number }>;
  locales: Array<{ locale: string; views: number }>;
};

/** Everything the admin dashboard shows, for the last `days` days. */
export async function visitorSummary(days = 30): Promise<VisitorSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDay = dhakaDateKey(since);

  const rows = await prisma.pageView.findMany({
    where: { day: { gte: sinceDay } },
    select: {
      day: true,
      path: true,
      referrerHost: true,
      device: true,
      locale: true,
      visitor: true,
    },
    take: 200_000,
  });

  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  const byPath = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byLocale = new Map<string, number>();
  const visitors = new Set<string>();

  for (const row of rows) {
    const day = byDay.get(row.day) ?? { views: 0, visitors: new Set<string>() };
    day.views += 1;
    day.visitors.add(row.visitor);
    byDay.set(row.day, day);

    byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
    if (row.referrerHost) {
      byReferrer.set(row.referrerHost, (byReferrer.get(row.referrerHost) ?? 0) + 1);
    }
    if (row.device) byDevice.set(row.device, (byDevice.get(row.device) ?? 0) + 1);
    if (row.locale) byLocale.set(row.locale, (byLocale.get(row.locale) ?? 0) + 1);
    // Unique over the whole range counts one person per day they visited,
    // because the hash rotates. That is the honest number to show.
    visitors.add(`${row.day}:${row.visitor}`);
  }

  const top = (map: Map<string, number>, take = 10) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);

  return {
    days: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, entry]) => ({
        day,
        views: entry.views,
        visitors: entry.visitors.size,
      })),
    totalViews: rows.length,
    totalVisitors: visitors.size,
    pages: top(byPath).map(([path, views]) => ({ path, views })),
    referrers: top(byReferrer).map(([host, views]) => ({ host, views })),
    devices: top(byDevice, 4).map(([device, views]) => ({ device, views })),
    locales: top(byLocale, 4).map(([locale, views]) => ({ locale, views })),
  };
}

/**
 * Drops views older than six months. Long enough to compare this admission
 * season with the last one, short enough that the table stays small and the
 * site holds no history nobody asked for.
 */
export async function pruneOldViews(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const result = await prisma.pageView.deleteMany({
    where: { day: { lt: dhakaDateKey(cutoff) } },
  });
  return result.count;
}

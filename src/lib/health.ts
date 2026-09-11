import { createHash } from "node:crypto";

import { dhakaDateKey } from "@/lib/health-schedule";
import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@/lib/site-settings";

/** Database side of the free health service (addendum 4). */

export * from "@/lib/health-schedule";

/**
 * Next serial for today, atomically. The counter row is keyed by day, so
 * numbers restart at 1 each morning and two simultaneous requests can never
 * receive the same number.
 */
export async function nextSerial(dateKey = dhakaDateKey()): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { key: `health-serial-${dateKey}` },
    create: { key: `health-serial-${dateKey}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

export type HealthStats = {
  patientsTotal: number;
  patientsThisMonth: number;
  reportsTotal: number;
  updatedAt: Date | null;
};

/** Base figures from Site Settings plus every daily count on top. */
export async function healthStats(
  health: SiteSettings["health"],
): Promise<HealthStats> {
  const monthPrefix = dhakaDateKey().slice(0, 6);
  const [all, month, latest] = await Promise.all([
    prisma.healthDailyCount.aggregate({ _sum: { patients: true, reports: true } }),
    prisma.healthDailyCount.aggregate({
      _sum: { patients: true },
      where: { date: { startsWith: monthPrefix } },
    }),
    prisma.healthDailyCount.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);
  return {
    patientsTotal: health.statsBasePatients + (all._sum.patients ?? 0),
    patientsThisMonth: month._sum.patients ?? 0,
    reportsTotal: health.statsBaseReports + (all._sum.reports ?? 0),
    updatedAt: latest?.updatedAt ?? null,
  };
}

/** One-way hash so a record stays countable but no longer identifies anyone. */
function hashIdentity(value: string): string {
  return `anon:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

/**
 * Replaces name and phone on appointments older than 90 days (addendum 4,
 * §5). Safe to run any time, as often as wanted; returns how many rows it
 * touched. Called from the admin page on load and from /api/cron/anonymize.
 */
export async function anonymizeOldAppointments(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 90 * 86_400_000);
  const stale = await prisma.healthAppointment.findMany({
    where: { anonymizedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, name: true, phone: true },
    take: 500,
  });
  if (stale.length === 0) return 0;
  await prisma.$transaction(
    stale.map((row) =>
      prisma.healthAppointment.update({
        where: { id: row.id },
        data: {
          name: hashIdentity(row.name),
          phone: hashIdentity(row.phone),
          complaint: null,
          area: null,
          referredBy: null,
          anonymizedAt: now,
        },
      }),
    ),
  );
  return stale.length;
}

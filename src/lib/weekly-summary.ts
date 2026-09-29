import "server-only";

import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * The Saturday morning summary for the owner (addendum 2, B9).
 *
 * Written as plain text because it goes by email and by SMS, and because a
 * summary somebody reads on a phone between other things has to survive being
 * skimmed. Numbers first, names only where a name is the action.
 */
export type WeeklySummary = { subject: string; body: string };

export async function buildWeeklySummary(now = new Date()): Promise<WeeklySummary> {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const settings = await getSiteSettings();

  const [
    leads,
    admissions,
    collected,
    outstanding,
    openAlerts,
    upcoming,
    worstDebtors,
  ] = await Promise.all([
    prisma.application.groupBy({
      by: ["source"],
      where: { createdAt: { gte: weekAgo }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.student.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
    prisma.payment.aggregate({
      where: { voidedAt: null, paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.alert.count({ where: { status: "OPEN" } }),
    prisma.batch.findMany({
      where: { status: "UPCOMING", published: true, deletedAt: null },
      select: { name: true, seats: true, seatsFilled: true },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    prisma.installment.findMany({
      where: { status: "OVERDUE" },
      include: { feePlan: { include: { student: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
  ]);

  const overdueTotal =
    (outstanding._sum.amount ?? 0) - (outstanding._sum.paidAmount ?? 0);
  const leadTotal = leads.reduce((sum, row) => sum + row._count._all, 0);

  const lines = [
    `MUTI — week to ${now.toDateString()}`,
    "",
    `New enquiries: ${leadTotal}`,
    ...leads
      .filter((row) => row._count._all > 0)
      .map((row) => `  ${row.source ?? "direct"}: ${row._count._all}`),
    `New students: ${admissions}`,
    "",
    `Collected this month: ${formatMoney(collected._sum.amount ?? 0, "en")}`,
    `Overdue right now: ${formatMoney(overdueTotal, "en")}`,
    ...(worstDebtors.length > 0
      ? [
          "  Longest waiting:",
          ...worstDebtors.map(
            (installment) =>
              `    ${installment.feePlan.student.name} — ${formatMoney(
                installment.amount - installment.paidAmount,
                "en",
              )}`,
          ),
        ]
      : []),
    "",
    `Open alerts: ${openAlerts}`,
    "",
    "Seats left in upcoming batches:",
    ...(upcoming.length > 0
      ? upcoming.map(
          (batch) =>
            `  ${batch.name}: ${
              batch.seats === null
                ? "no limit set"
                : `${Math.max(0, batch.seats - batch.seatsFilled)} of ${batch.seats}`
            }`,
        )
      : ["  no upcoming batch is published"]),
  ];

  return {
    subject: `${settings.general.shortName || "MUTI"} weekly summary`,
    body: lines.join("\n"),
  };
}

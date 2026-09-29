import Link from "next/link";

import { AlertRow } from "@/components/admin/alert-row";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Alerts" };

const TABS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Closed" },
] as const;

/**
 * Students who need a phone call (addendum 2, B6): the ones who have stopped
 * coming, and the ones whose fees are a fortnight past due.
 */
export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("alerts.manage");
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((entry) => entry.value === tabParam) ? tabParam! : "open";

  const [rows, openCount, dropout, fees] = await Promise.all([
    prisma.alert.findMany({
      where: { status: tab === "open" ? "OPEN" : "RESOLVED" },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        student: { select: { id: true, name: true, roll: true, phone: true } },
        resolvedBy: { select: { name: true } },
      },
    }),
    prisma.alert.count({ where: { status: "OPEN" } }),
    prisma.alert.count({ where: { status: "OPEN", type: "DROPOUT_RISK" } }),
    prisma.alert.count({ where: { status: "OPEN", type: "OVERDUE_FEES" } }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Alerts"
        description="Raised overnight: students who have stopped coming, and fees a fortnight past due. Close one with a note when it has been dealt with."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Open" value={openCount} />
        <StatCard label="Stopped coming" value={dropout} />
        <StatCard label="Fees overdue" value={fees} />
      </div>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="View">
        {TABS.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/alerts?tab=${entry.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              entry.value === tab
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title={tab === "open" ? "Nothing needs attention." : "Nothing closed yet."}
          description={
            tab === "open"
              ? "Alerts are raised by the nightly job when a student stops attending or a fee goes a fortnight past due."
              : undefined
          }
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <ul className="divide-y divide-[color:var(--border)]">
            {rows.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={{
                  id: alert.id,
                  type: alert.type,
                  message: alert.message,
                  status: alert.status,
                  note: alert.note,
                  createdAt: alert.createdAt.toISOString(),
                  resolvedBy: alert.resolvedBy?.name ?? null,
                  studentId: alert.student?.id ?? null,
                  studentPhone: alert.student?.phone ?? null,
                }}
              />
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

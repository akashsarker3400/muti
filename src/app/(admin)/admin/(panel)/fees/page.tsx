import Link from "next/link";

import {
  AdminBadge,
  AdminPageHeader,
  EmptyState,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { formatDate, formatMoney } from "@/lib/format";
import { langOf } from "@/lib/lang";
import { prisma } from "@/lib/prisma";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fees" };

const TABS = [
  { value: "overdue", label: "Overdue" },
  { value: "due", label: "Due soon" },
  { value: "collections", label: "Collections" },
] as const;

/**
 * The money view across every student (addendum 2, B2): who is behind, what
 * is coming, and what came in.
 */
export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("fees.view");
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((entry) => entry.value === tabParam) ? tabParam! : "overdue";

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const [overdue, dueSoon, payments, collectedThisMonth, outstanding] =
    await Promise.all([
      prisma.installment.findMany({
        where: { status: "OVERDUE" },
        orderBy: { dueDate: "asc" },
        take: 100,
        include: {
          feePlan: {
            include: { student: { select: { id: true, name: true, roll: true } } },
          },
        },
      }),
      prisma.installment.findMany({
        where: { status: { in: ["DUE", "PARTIAL"] }, dueDate: { lte: soon } },
        orderBy: { dueDate: "asc" },
        take: 100,
        include: {
          feePlan: {
            include: { student: { select: { id: true, name: true, roll: true } } },
          },
        },
      }),
      prisma.payment.findMany({
        where: { voidedAt: null },
        orderBy: { paidAt: "desc" },
        take: 100,
        include: {
          student: { select: { id: true, name: true, roll: true } },
          receivedBy: { select: { name: true } },
        },
      }),
      prisma.payment.aggregate({
        where: { voidedAt: null, paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.installment.aggregate({
        where: { status: { in: ["DUE", "PARTIAL", "OVERDUE"] } },
        _sum: { amount: true, paidAmount: true },
      }),
    ]);

  const stillOwed = (outstanding._sum.amount ?? 0) - (outstanding._sum.paidAmount ?? 0);
  const overdueTotal = overdue.reduce(
    (sum, row) => sum + (row.amount - row.paidAmount),
    0,
  );

  return (
    <>
      <AdminPageHeader
        title="Fees"
        description="Who is behind, what falls due next, and every receipt taken."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Collected this month"
          value={formatMoney(collectedThisMonth._sum.amount ?? 0, "en")}
        />
        <StatCard label="Outstanding" value={formatMoney(stillOwed, "en")} />
        <StatCard
          label="Overdue"
          value={formatMoney(overdueTotal, "en")}
          hint={`${overdue.length} instalment${overdue.length === 1 ? "" : "s"}`}
        />
      </div>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="View">
        {TABS.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/fees?tab=${entry.value}`}
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

      {tab === "collections" ? (
        payments.length === 0 ? (
          <EmptyState title="No payment has been taken yet." />
        ) : (
          <Panel padded={false} className="overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <tbody className="divide-y divide-[color:var(--border)]">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-2.5 font-latin whitespace-nowrap">
                      {payment.receiptNo}
                      <span className="block text-xs text-[color:var(--muted-foreground)]">
                        {formatDate(payment.paidAt, "en")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/students/${payment.student.id}/fees`}
                        className="underline"
                        lang={langOf(payment.student.name)}
                      >
                        {payment.student.name}
                      </Link>
                      <span className="block font-latin text-xs text-[color:var(--muted-foreground)]">
                        {payment.student.roll}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-latin">
                      {formatMoney(payment.amount, "en")}
                      <span className="block text-xs text-[color:var(--muted-foreground)]">
                        {payment.method.toLowerCase()}
                        {payment.receivedBy ? ` · ${payment.receivedBy.name}` : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )
      ) : (
        <InstallmentList rows={tab === "overdue" ? overdue : dueSoon} tab={tab} />
      )}
    </>
  );
}

type Row = {
  id: string;
  label: string;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  status: string;
  feePlan: { student: { id: string; name: string; roll: string } };
};

function InstallmentList({ rows, tab }: { rows: Row[]; tab: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={
          tab === "overdue"
            ? "Nothing is overdue."
            : "Nothing falls due in the next month."
        }
      />
    );
  }

  return (
    <Panel padded={false} className="overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <tbody className="divide-y divide-[color:var(--border)]">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2.5">
                <Link
                  href={`/admin/students/${row.feePlan.student.id}/fees`}
                  className="underline"
                  lang={langOf(row.feePlan.student.name)}
                >
                  {row.feePlan.student.name}
                </Link>
                <span className="block font-latin text-xs text-[color:var(--muted-foreground)]">
                  {row.feePlan.student.roll}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {row.label}
                <span className="block text-xs text-[color:var(--muted-foreground)]">
                  due {formatDate(row.dueDate, "en")}
                </span>
              </td>
              <td className="px-4 py-2.5 font-latin">
                {formatMoney(row.amount - row.paidAmount, "en")}
                {row.paidAmount > 0 && (
                  <span className="block text-xs text-[color:var(--muted-foreground)]">
                    of {formatMoney(row.amount, "en")}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <AdminBadge tone={row.status === "OVERDUE" ? "danger" : "neutral"}>
                  {row.status === "OVERDUE" ? "Overdue" : "Due"}
                </AdminBadge>
              </td>
              <td className="px-4 py-2.5 text-end">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/students/${row.feePlan.student.id}/fees`}>
                    Take payment
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

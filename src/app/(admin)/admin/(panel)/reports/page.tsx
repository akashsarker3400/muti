import { AdminBadge, AdminPageHeader, Panel, StatCard } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildReports } from "@/lib/reports";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reports" };

/**
 * The owner's page (addendum 2, B8).
 *
 * Six questions, in the order they get asked: did we collect, what is still
 * out there, where do the enquiries come from, which of them become students,
 * how are the batches doing, and what needs attention.
 */
export default async function ReportsPage() {
  await requirePermission("reports.view");
  const [reports, teacherDue] = await Promise.all([
    buildReports(),
    prisma.teacherPayment.aggregate({
      where: { paidAt: null },
      _sum: { amount: true },
    }),
  ]);

  const busiest = Math.max(1, ...reports.collections.map((point) => point.value));
  const mostAdmissions = Math.max(1, ...reports.admissions.map((point) => point.value));

  return (
    <>
      <AdminPageHeader
        title="Reports"
        description="Money, enquiries and batches over the last twelve months."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={formatMoney(reports.collectedThisMonth, "en")}
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(reports.outstanding, "en")}
          hint={`${formatMoney(reports.overdue, "en")} overdue`}
        />
        <StatCard
          label="Collection rate"
          value={
            reports.collectionRate === null ? "—" : `${reports.collectionRate}%`
          }
          hint="collected ÷ (collected + overdue)"
        />
        <StatCard
          label="Open alerts"
          value={reports.openAlerts}
          hint={
            (teacherDue._sum.amount ?? 0) > 0
              ? `${formatMoney(teacherDue._sum.amount ?? 0, "en")} owed to teachers`
              : undefined
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Chart
          title="Collected per month"
          points={reports.collections}
          largest={busiest}
          format={(value) => formatMoney(value, "en")}
        />
        <Chart
          title="New students per month"
          points={reports.admissions}
          largest={mostAdmissions}
          format={(value) => String(value)}
        />

        <Panel>
          <h2 className="text-base font-semibold">Where enquiries come from</h2>
          {reports.leads.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              No enquiry in the last twelve months.
            </p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-start text-xs text-[color:var(--muted-foreground)]">
                  <th scope="col" className="text-start font-medium">Source</th>
                  <th scope="col" className="text-start font-medium">Enquiries</th>
                  <th scope="col" className="text-start font-medium">Admitted</th>
                  <th scope="col" className="text-start font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {reports.leads.map((lead) => (
                  <tr key={lead.source} className="border-t border-[color:var(--border)]">
                    <td className="py-2">{lead.source}</td>
                    <td className="py-2 font-latin">{lead.total}</td>
                    <td className="py-2 font-latin">{lead.admitted}</td>
                    <td className="py-2 font-latin">
                      {Math.round((lead.admitted / lead.total) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel>
          <h2 className="text-base font-semibold">Batches</h2>
          {reports.batches.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              No batch is upcoming or running.
            </p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-start text-xs text-[color:var(--muted-foreground)]">
                  <th scope="col" className="text-start font-medium">Batch</th>
                  <th scope="col" className="text-start font-medium">Seats</th>
                  <th scope="col" className="text-start font-medium">Attendance</th>
                  <th scope="col" className="text-start font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {reports.batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-[color:var(--border)]">
                    <td className="py-2">{batch.name}</td>
                    <td className="py-2 font-latin">
                      {batch.seats === null
                        ? `${batch.students}`
                        : `${batch.filled}/${batch.seats}`}
                    </td>
                    <td className="py-2 font-latin">
                      {batch.attendance === null ? (
                        <span className="text-[color:var(--muted-foreground)]">—</span>
                      ) : (
                        <AdminBadge
                          tone={batch.attendance >= 75 ? "success" : "warning"}
                        >
                          {batch.attendance}%
                        </AdminBadge>
                      )}
                    </td>
                    <td className="py-2 font-latin">{formatMoney(batch.due, "en")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}

function Chart({
  title,
  points,
  largest,
  format,
}: {
  title: string;
  points: Array<{ month: string; value: number }>;
  largest: number;
  format: (value: number) => string;
}) {
  return (
    <Panel>
      <h2 className="text-base font-semibold">{title}</h2>
      <ol className="mt-4 flex h-36 items-end gap-1">
        {points.map((point) => (
          <li
            key={point.month}
            className="group relative flex-1"
            style={{ height: `${Math.max(2, (point.value / largest) * 100)}%` }}
            title={`${point.month}: ${format(point.value)}`}
          >
            <span
              className={cn(
                "block size-full rounded-t bg-[color:var(--brand)]",
                point.value === 0 ? "opacity-20" : "opacity-80",
              )}
            />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex justify-between font-latin text-xs text-[color:var(--muted-foreground)]">
        <span>{points[0]?.month}</span>
        <span>{points.at(-1)?.month}</span>
      </div>
    </Panel>
  );
}

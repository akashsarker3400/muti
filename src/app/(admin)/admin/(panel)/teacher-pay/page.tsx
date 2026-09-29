import { TeacherPayTable } from "@/components/admin/teacher-pay-table";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { formatDate, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { paidInPeriod, teacherDues } from "@/lib/teacher-pay";

export const dynamic = "force-dynamic";

export const metadata = { title: "Teacher payments" };

/**
 * What each teacher is owed for the classes they took (addendum 2, B7).
 *
 * The register decides the pay: only classes marked DONE count. That is the
 * right incentive and the right record — a class nobody registered did not
 * visibly happen.
 */
export default async function TeacherPayPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("teachers.pay");
  const { from: fromParam, to: toParam } = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : defaultFrom;
  const to = toParam ? new Date(`${toParam}T23:59:59`) : defaultTo;

  const [dues, paid, teachers] = await Promise.all([
    teacherDues(from, to),
    paidInPeriod(from, to),
    prisma.faculty.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        rates: { orderBy: { effectiveFrom: "desc" }, take: 4 },
      },
    }),
  ]);

  const owed = dues.reduce((sum, due) => sum + due.amount, 0);
  const paidOut = paid.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <>
      <AdminPageHeader
        title="Teacher payments"
        description={`Classes marked taken between ${formatDate(from, "en")} and ${formatDate(to, "en")}.`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Classes taken"
          value={dues.reduce((sum, d) => sum + d.sessions, 0)}
        />
        <StatCard label="Due for the period" value={formatMoney(owed, "en")} />
        <StatCard label="Already paid" value={formatMoney(paidOut, "en")} />
      </div>

      {dues.length === 0 ? (
        <EmptyState
          title="No classes were taken in this period."
          description="A class counts once its register has been saved."
        />
      ) : (
        <TeacherPayTable
          dues={dues}
          from={from.toISOString().slice(0, 10)}
          to={to.toISOString().slice(0, 10)}
          rates={teachers.map((teacher) => ({
            facultyId: teacher.id,
            name: teacher.name,
            rates: teacher.rates.map((rate) => ({
              type: rate.type,
              ratePerClass: rate.ratePerClass,
            })),
          }))}
        />
      )}

      {paid.length > 0 && (
        <Panel padded={false} className="mt-5 overflow-hidden">
          <h2 className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-4 py-3 text-sm font-semibold">
            Paid for this period
          </h2>
          <table className="w-full border-collapse text-sm">
            <tbody className="divide-y divide-[color:var(--border)]">
              {paid.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-2.5">{payment.faculty.name}</td>
                  <td className="px-4 py-2.5 font-latin">
                    {formatMoney(payment.amount, "en")}
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      {payment.sessionsCount} classes
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[color:var(--muted-foreground)]">
                    {payment.paidAt ? formatDate(payment.paidAt, "en") : "not paid"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}

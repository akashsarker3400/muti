import Link from "next/link";
import { notFound } from "next/navigation";

import { CreateFeePlanButton } from "@/components/admin/create-fee-plan-button";
import { FeeLedger } from "@/components/admin/fee-ledger";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { feeSummary } from "@/lib/fees";
import { formatMoney } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fees" };

/**
 * One student's fees (addendum 2, B2): what they owe, what they have paid,
 * and every receipt that says so.
 */
export default async function StudentFeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("fees.view");
  const me = await requireAdmin();
  const { id } = await params;

  const [student, summary] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        course: { select: { nameEn: true, courseFee: true, durationMonths: true } },
        feePlan: { include: { installments: { orderBy: { seq: "asc" } } } },
        payments: {
          orderBy: { paidAt: "desc" },
          include: { receivedBy: { select: { name: true } } },
        },
      },
    }),
    feeSummary(id),
  ]);
  if (!student) notFound();

  return (
    <>
      <AdminPageHeader
        title={`Fees — ${student.name}`}
        description={`${student.roll} · ${student.course.nameEn}`}
        action={
          <Button asChild variant="outline" size="cta">
            <Link href={`/admin/students/${student.id}`}>Student record</Link>
          </Button>
        }
      />

      {!student.feePlan || !summary ? (
        <EmptyState
          title="No fee plan yet."
          description="Create one from the course price: half at admission and the balance monthly. Every figure is editable afterwards."
          action={
            hasPermission(me, "fees.edit") ? (
              <CreateFeePlanButton
                studentId={student.id}
                courseFee={student.course.courseFee}
                months={Math.max(0, (student.course.durationMonths ?? 1) - 1)}
              />
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={formatMoney(summary.total, "en")} />
            <StatCard label="Paid" value={formatMoney(summary.paid, "en")} />
            <StatCard
              label="Still due"
              value={formatMoney(summary.due, "en")}
              hint={summary.nextDue ? `next: ${summary.nextDue.label}` : undefined}
            />
            <StatCard
              label="Overdue"
              value={formatMoney(summary.overdue, "en")}
              hint={summary.overdue > 0 ? "past the grace week" : "nothing overdue"}
            />
          </div>

          {student.feePlan.discount > 0 && (
            <Panel className="mb-5 text-sm">
              <strong>Discount {formatMoney(student.feePlan.discount, "en")}</strong>
              {student.feePlan.discountReason
                ? ` — ${student.feePlan.discountReason}`
                : ""}
            </Panel>
          )}

          <FeeLedger
            studentId={student.id}
            canCollect={hasPermission(me, "fees.collect")}
            canEdit={hasPermission(me, "fees.edit")}
            canVoid={hasPermission(me, "payments.void")}
            installments={student.feePlan.installments.map((installment) => ({
              id: installment.id,
              seq: installment.seq,
              label: installment.label,
              dueDate: installment.dueDate.toISOString(),
              amount: installment.amount,
              paidAmount: installment.paidAmount,
              status: installment.status,
            }))}
            payments={student.payments.map((payment) => ({
              id: payment.id,
              receiptNo: payment.receiptNo,
              amount: payment.amount,
              method: payment.method,
              reference: payment.reference,
              paidAt: payment.paidAt.toISOString(),
              receivedBy: payment.receivedBy?.name ?? null,
              voided: payment.voidedAt !== null,
              voidReason: payment.voidReason,
            }))}
          />
        </>
      )}
    </>
  );
}

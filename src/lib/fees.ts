import "server-only";

import { prisma } from "@/lib/prisma";

export {
  GRACE_DAYS,
  draftInstallments,
  statusFor,
  type DraftInstallment,
  type PlanDraft,
} from "@/lib/fees-math";

import { GRACE_DAYS, statusFor } from "@/lib/fees-math";

/**
 * Fees as they touch the database (addendum 2, B2). The arithmetic itself
 * lives in `src/lib/fees-math.ts`, which needs no database to answer.
 */

export type FeeSummary = {
  total: number;
  paid: number;
  due: number;
  overdue: number;
  nextDue: { id: string; label: string; dueDate: Date; remaining: number } | null;
};

/** One student's position, for the record page and the portal. */
export async function feeSummary(studentId: string): Promise<FeeSummary | null> {
  const plan = await prisma.feePlan.findUnique({
    where: { studentId },
    include: { installments: { orderBy: { seq: "asc" } } },
  });
  if (!plan) return null;

  let paid = 0;
  let overdue = 0;
  let nextDue: FeeSummary["nextDue"] = null;

  for (const installment of plan.installments) {
    paid += installment.paidAmount;
    const remaining = installment.amount - installment.paidAmount;
    if (remaining <= 0) continue;

    if (installment.status === "OVERDUE") overdue += remaining;
    if (!nextDue) {
      nextDue = {
        id: installment.id,
        label: installment.label,
        dueDate: installment.dueDate,
        remaining,
      };
    }
  }

  return {
    total: plan.total,
    paid,
    due: Math.max(0, plan.total - paid),
    overdue,
    nextDue,
  };
}

/**
 * Re-reads an installment's paid total from its payments and restates its
 * status. Called after every payment and every void, so the stored figure can
 * never drift from the receipts that justify it.
 */
export async function restateInstallment(installmentId: string): Promise<void> {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: { payments: { where: { voidedAt: null }, select: { amount: true } } },
  });
  if (!installment) return;

  const paidAmount = installment.payments.reduce((sum, row) => sum + row.amount, 0);

  await prisma.installment.update({
    where: { id: installmentId },
    data: {
      paidAmount,
      status: statusFor(installment.amount, paidAmount, installment.dueDate),
    },
  });
}

/** Marks every unpaid installment past its grace period as overdue. */
export async function markOverdue(now = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - GRACE_DAYS);

  const result = await prisma.installment.updateMany({
    where: { status: { in: ["DUE", "PARTIAL"] }, dueDate: { lt: cutoff } },
    data: { status: "OVERDUE" },
  });
  return result.count;
}

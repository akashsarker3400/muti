import type { InstallmentStatus } from "@/generated/prisma/enums";

/**
 * The arithmetic behind a fee plan (addendum 2, B2).
 *
 * Kept apart from `src/lib/fees.ts` because this is the part that has to be
 * tested exhaustively and the part that must never need a database to answer.
 *
 * Money is whole Taka in an `Int` everywhere. No fee here is charged in paisa,
 * and a floating point Taka is a rupee lost eventually — in a ledger that has
 * to add up at the end of the month, that is not a trade worth making.
 */

/** Days after the due date before an installment is called overdue. */
export const GRACE_DAYS = 7;

export type PlanDraft = {
  courseFee: number;
  otherFees: number;
  discount: number;
  /** How many instalments the balance is split into after the first payment. */
  instalments: number;
  /** First due date; the rest fall on the 1st of the following months. */
  firstDueDate: Date;
};

export type DraftInstallment = {
  seq: number;
  label: string;
  dueDate: Date;
  amount: number;
};

/**
 * Half at admission, the balance spread over the months that follow.
 *
 * That is how the office already collects, and the arithmetic has one rule
 * worth stating: the rounding goes into the **first** instalment, never the
 * last. A student who pays on time should never find a stray Taka waiting at
 * the end of the course.
 */
export function draftInstallments(draft: PlanDraft): {
  total: number;
  installments: DraftInstallment[];
} {
  const total = Math.max(0, draft.courseFee + draft.otherFees - draft.discount);
  if (total === 0) return { total, installments: [] };

  const admission = Math.round(total / 2);
  const balance = total - admission;
  const count = Math.max(0, Math.floor(draft.instalments));

  const installments: DraftInstallment[] = [
    {
      seq: 1,
      label: "At admission",
      dueDate: draft.firstDueDate,
      amount: count === 0 ? total : admission,
    },
  ];

  if (count > 0 && balance > 0) {
    const each = Math.floor(balance / count);
    const remainder = balance - each * count;

    for (let index = 0; index < count; index += 1) {
      const due = new Date(draft.firstDueDate);
      due.setMonth(due.getMonth() + index + 1, 1);
      due.setHours(0, 0, 0, 0);

      installments.push({
        seq: index + 2,
        label: `Instalment ${index + 1}`,
        // The odd Taka rides with the first instalment, not the last.
        amount: index === 0 ? each + remainder : each,
        dueDate: due,
      });
    }
  }

  return { total, installments };
}

/** What an installment's status should be, given what has been paid. */
export function statusFor(
  amount: number,
  paidAmount: number,
  dueDate: Date,
  now = new Date(),
): InstallmentStatus {
  if (paidAmount >= amount) return "PAID";

  const overdueFrom = new Date(dueDate);
  overdueFrom.setDate(overdueFrom.getDate() + GRACE_DAYS);
  if (now > overdueFrom) return "OVERDUE";

  return paidAmount > 0 ? "PARTIAL" : "DUE";
}

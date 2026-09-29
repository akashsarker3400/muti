"use server";

import { revalidatePath } from "next/cache";

import type { PaymentMethod } from "@/generated/prisma/enums";
import { logActivity, requirePermission } from "@/lib/admin-auth";
import { draftInstallments, restateInstallment } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

/** Fees, installments and payments (addendum 2, B2). */

const METHODS: PaymentMethod[] = ["CASH", "BKASH", "NAGAD", "BANK", "ONLINE"];

/**
 * Receipt numbers, from the same atomic counter the certificates use, so two
 * people taking money at the same moment cannot write the same receipt.
 * `INV-2026-00042` in the shape the ERP addendum asks for.
 */
async function nextReceiptNo(at = new Date()): Promise<string> {
  const year = at.getFullYear();
  const key = `receipt:${year}`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const counter = await prisma.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    const receiptNo = `RCT-${year}-${String(counter.value).padStart(5, "0")}`;
    const taken = await prisma.payment.findUnique({
      where: { receiptNo },
      select: { id: true },
    });
    if (!taken) return receiptNo;
  }
  throw new Error("Could not allocate a receipt number");
}

/**
 * Builds the fee plan for a student from their course price.
 *
 * Half at admission and the balance monthly, which is how the office already
 * collects. Everything is editable afterwards: the plan records what this
 * student was told they owe, so a later change to the course price must not
 * reach back and rewrite it.
 */
export async function createFeePlan(input: {
  studentId: string;
  instalments?: number;
  discount?: number;
  discountReason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("fees.edit");

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    include: { course: true, feePlan: { select: { id: true } } },
  });
  if (!student) return { ok: false, error: "That student no longer exists." };
  if (student.feePlan)
    return { ok: false, error: "This student already has a fee plan." };

  const course = student.course;
  const otherFees =
    (course.examFee ?? 0) + (course.formFee ?? 0) + (course.bookFee ?? 0);
  const instalments =
    input.instalments ?? Math.max(0, (course.durationMonths ?? 1) - 1);

  const { total, installments } = draftInstallments({
    courseFee: course.courseFee,
    otherFees,
    discount: Math.max(0, input.discount ?? 0),
    instalments,
    firstDueDate: student.admissionDate ?? new Date(),
  });

  try {
    await prisma.feePlan.create({
      data: {
        studentId: student.id,
        courseFee: course.courseFee,
        otherFees,
        discount: Math.max(0, input.discount ?? 0),
        discountReason: input.discountReason?.trim() || null,
        total,
        installments: { create: installments },
      },
    });
    await logActivity(admin.id, "fee-plan", "student", student.id);
    revalidatePath(`/admin/students/${student.id}/fees`);
    return { ok: true };
  } catch (error) {
    console.error("createFeePlan failed", error);
    return { ok: false, error: "Could not create the fee plan." };
  }
}

/** Edits one installment: the office moves a date or changes an amount. */
export async function saveInstallment(input: {
  id: string;
  label?: string;
  dueDate?: string;
  amount?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("fees.edit");

  const dueDate = input.dueDate
    ? new Date(`${input.dueDate}T00:00:00.000Z`)
    : undefined;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return { ok: false, error: "That date could not be read." };
  }
  if (
    input.amount !== undefined &&
    (!Number.isFinite(input.amount) || input.amount < 0)
  ) {
    return { ok: false, error: "The amount must be a whole number of Taka." };
  }

  try {
    await prisma.installment.update({
      where: { id: input.id },
      data: {
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(input.amount !== undefined ? { amount: Math.round(input.amount) } : {}),
      },
    });
    // The amount or the date changed, so the status may have changed with it.
    await restateInstallment(input.id);
    await logActivity(admin.id, "installment-save", "installment", input.id);
    revalidatePath("/admin/fees");
    return { ok: true };
  } catch (error) {
    console.error("saveInstallment failed", error);
    return { ok: false, error: "Could not save the instalment." };
  }
}

/**
 * Takes a payment and writes the receipt.
 *
 * The amount is applied to one installment, and that installment's paid total
 * is then re-read from its own receipts rather than incremented, so the two
 * can never drift apart.
 */
export async function recordPayment(input: {
  studentId: string;
  installmentId?: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paidAt?: string;
}): Promise<{ ok: true; receiptNo: string } | { ok: false; error: string }> {
  const admin = await requirePermission("fees.collect");

  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter the amount received, in whole Taka." };
  }
  const method = METHODS.includes(input.method as PaymentMethod)
    ? (input.method as PaymentMethod)
    : "CASH";

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, name: true, phone: true, roll: true },
  });
  if (!student) return { ok: false, error: "That student no longer exists." };

  try {
    const receiptNo = await nextReceiptNo();
    await prisma.payment.create({
      data: {
        receiptNo,
        studentId: student.id,
        installmentId: input.installmentId || null,
        amount,
        method,
        reference: input.reference?.trim() || null,
        note: input.note?.trim() || null,
        receivedById: admin.id,
        paidAt: input.paidAt ? new Date(`${input.paidAt}T00:00:00.000Z`) : new Date(),
      },
    });

    if (input.installmentId) await restateInstallment(input.installmentId);

    // Tell the student their money arrived. Never blocks the receipt: the
    // payment is recorded either way and the outbox shows what happened.
    const settings = await getSiteSettings();
    const { sendTemplate } = await import("@/lib/messaging");
    await sendTemplate({
      key: "payment-received",
      to: student.phone ?? "",
      values: {
        name: student.name,
        roll: student.roll,
        amount: String(amount),
        receipt: receiptNo,
        institute: settings.general.shortName || settings.general.nameEn,
      },
      entity: "payment",
      entityId: receiptNo,
      dedupeKey: `payment:${receiptNo}`,
      userId: admin.id,
    });

    await logActivity(admin.id, "payment", "payment", receiptNo);
    revalidatePath(`/admin/students/${student.id}/fees`);
    revalidatePath("/admin/fees");
    return { ok: true, receiptNo };
  } catch (error) {
    console.error("recordPayment failed", error);
    return { ok: false, error: "Could not record the payment." };
  }
}

/**
 * Voids a payment. Never deletes one: a receipt that was handed over is a
 * fact, and the register has to show that it was cancelled and why.
 */
export async function voidPayment(
  id: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePermission("payments.void");
  if (!reason.trim()) {
    return { ok: false, error: "Write why this receipt is being cancelled." };
  }

  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidReason: reason.trim(),
        voidedById: admin.id,
      },
      select: { installmentId: true, studentId: true, receiptNo: true },
    });
    if (payment.installmentId) await restateInstallment(payment.installmentId);

    await logActivity(admin.id, "payment-void", "payment", payment.receiptNo);
    revalidatePath(`/admin/students/${payment.studentId}/fees`);
    revalidatePath("/admin/fees");
    return { ok: true };
  } catch (error) {
    console.error("voidPayment failed", error);
    return { ok: false, error: "Could not void the payment." };
  }
}

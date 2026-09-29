"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";

import { recordPayment, saveInstallment, voidPayment } from "@/app/actions/admin-fees";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoney } from "@/lib/format";

type Installment = {
  id: string;
  seq: number;
  label: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
};

type Payment = {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
  receivedBy: string | null;
  voided: boolean;
  voidReason: string | null;
};

const STATUS = {
  DUE: { label: "Due", tone: "neutral" },
  PARTIAL: { label: "Part paid", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  OVERDUE: { label: "Overdue", tone: "danger" },
} as const;

const METHODS = ["CASH", "BKASH", "NAGAD", "BANK"] as const;

const SELECT =
  "h-11 w-full rounded-md border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/**
 * The instalment plan and the receipts against it.
 *
 * Taking money is the one thing here that must be quick and hard to get
 * wrong: the form opens with the next instalment and its remaining amount
 * already filled in, because that is what is being paid nine times out of ten.
 */
export function FeeLedger({
  studentId,
  installments,
  payments,
  canCollect,
  canEdit,
  canVoid,
}: {
  studentId: string;
  installments: Installment[];
  payments: Payment[];
  canCollect: boolean;
  canEdit: boolean;
  canVoid: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const next = installments.find(
    (installment) => installment.paidAmount < installment.amount,
  );
  const [installmentId, setInstallmentId] = useState(next?.id ?? "");
  const [amount, setAmount] = useState(
    next ? String(next.amount - next.paidAmount) : "",
  );
  const [method, setMethod] = useState<string>("CASH");
  const [reference, setReference] = useState("");

  function collect() {
    startTransition(async () => {
      const result = await recordPayment({
        studentId,
        installmentId: installmentId || undefined,
        amount: Number(amount),
        method,
        reference,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Receipt ${result.receiptNo}`);
      setOpen(false);
      setReference("");
      router.refresh();
    });
  }

  function editInstallment(installment: Installment) {
    const raw = window.prompt(
      `Amount for "${installment.label}" in Taka`,
      String(installment.amount),
    );
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a whole number of Taka.");
      return;
    }
    startTransition(async () => {
      const result = await saveInstallment({ id: installment.id, amount: value });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save.");
        return;
      }
      router.refresh();
    });
  }

  function cancel(payment: Payment) {
    const reason = window.prompt(
      `Why is receipt ${payment.receiptNo} being cancelled?`,
    );
    if (!reason?.trim()) return;
    startTransition(async () => {
      const result = await voidPayment(payment.id, reason);
      if (!result.ok) {
        toast.error(result.error ?? "Could not void.");
        return;
      }
      toast.success("Receipt cancelled.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {canCollect && (
        <Panel>
          {open ? (
            <div className="grid gap-4 sm:grid-cols-4 sm:items-end">
              <div>
                <Label htmlFor="pay-installment">Towards</Label>
                <select
                  id="pay-installment"
                  value={installmentId}
                  onChange={(event) => {
                    setInstallmentId(event.target.value);
                    const chosen = installments.find(
                      (entry) => entry.id === event.target.value,
                    );
                    if (chosen) setAmount(String(chosen.amount - chosen.paidAmount));
                  }}
                  className={`mt-1 ${SELECT}`}
                >
                  <option value="">Not against an instalment</option>
                  {installments.map((installment) => (
                    <option key={installment.id} value={installment.id}>
                      {installment.label} —{" "}
                      {formatMoney(installment.amount - installment.paidAmount, "en")}{" "}
                      left
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pay-amount">Amount (Taka)</Label>
                <Input
                  id="pay-amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                  dir="ltr"
                  className="mt-1 h-11 font-latin"
                />
              </div>
              <div>
                <Label htmlFor="pay-method">Method</Label>
                <select
                  id="pay-method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className={`mt-1 ${SELECT}`}
                >
                  {METHODS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry === "CASH" ? "Cash" : entry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pay-reference">Reference</Label>
                <Input
                  id="pay-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="bKash TrxID, slip no"
                  className="mt-1 h-11 font-latin"
                />
              </div>
              <div className="flex gap-2 sm:col-span-4">
                <Button
                  type="button"
                  variant="brand"
                  size="cta"
                  disabled={pending || !amount}
                  onClick={collect}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Receipt className="size-4" aria-hidden="true" />
                  )}
                  Take payment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="cta"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="brand"
              size="cta"
              onClick={() => setOpen(true)}
            >
              <Wallet className="size-4" aria-hidden="true" />
              Take a payment
            </Button>
          )}
        </Panel>
      )}

      <Panel padded={false} className="overflow-hidden">
        <h2 className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-4 py-3 text-sm font-semibold">
          Instalments
        </h2>
        <table className="w-full border-collapse text-sm">
          <tbody className="divide-y divide-[color:var(--border)]">
            {installments.map((installment) => {
              const status =
                STATUS[installment.status as keyof typeof STATUS] ?? STATUS.DUE;
              return (
                <tr key={installment.id}>
                  <td className="px-4 py-2.5">
                    {installment.label}
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      due {formatDate(installment.dueDate, "en")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-latin whitespace-nowrap">
                    {formatMoney(installment.amount, "en")}
                    {installment.paidAmount > 0 && (
                      <span className="block text-xs text-[color:var(--muted-foreground)]">
                        paid {formatMoney(installment.paidAmount, "en")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => editInstallment(installment)}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Panel padded={false} className="overflow-hidden">
        <h2 className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-4 py-3 text-sm font-semibold">
          Receipts
        </h2>
        {payments.length === 0 ? (
          <p className="p-4 text-sm text-[color:var(--muted-foreground)]">
            No payment has been taken yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <tbody className="divide-y divide-[color:var(--border)]">
              {payments.map((payment) => (
                <tr key={payment.id} className={payment.voided ? "opacity-60" : ""}>
                  <td className="px-4 py-2.5 font-latin whitespace-nowrap">
                    {payment.receiptNo}
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      {formatDate(payment.paidAt, "en")}
                      {payment.receivedBy ? ` · ${payment.receivedBy}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-latin">
                    {formatMoney(payment.amount, "en")}
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      {payment.method.toLowerCase()}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {payment.voided ? (
                      <>
                        <AdminBadge tone="danger">Cancelled</AdminBadge>
                        {payment.voidReason && (
                          <span className="block text-xs text-[color:var(--muted-foreground)]">
                            {payment.voidReason}
                          </span>
                        )}
                      </>
                    ) : (
                      <AdminBadge tone="success">Received</AdminBadge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`/admin/receipts/${payment.id}`}
                          target="_blank"
                          rel="noopener"
                        >
                          <Receipt className="size-4" aria-hidden="true" />
                          Receipt
                        </a>
                      </Button>
                      {canVoid && !payment.voided && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Cancel receipt ${payment.receiptNo}`}
                          disabled={pending}
                          onClick={() => cancel(payment)}
                        >
                          <Ban className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

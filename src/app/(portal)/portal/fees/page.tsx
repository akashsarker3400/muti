import { redirect } from "next/navigation";

import { myFees } from "@/app/actions/portal";
import { formatDate, formatMoney } from "@/lib/format";
import { currentStudent } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "ফি" };

const STATUS: Record<string, string> = {
  DUE: "বাকি",
  PARTIAL: "আংশিক",
  PAID: "পরিশোধিত",
  OVERDUE: "মেয়াদ পেরিয়েছে",
};

/** Instalments and receipts (addendum 2, B12). */
export default async function PortalFees() {
  if (!(await currentStudent())) redirect("/portal");
  const data = await myFees();

  if (!data?.plan) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">ফি</h1>
        <p className="rounded-2xl bg-white p-5 text-sm text-[color:var(--muted-foreground)]">
          আপনার ফি-র হিসাব এখনো তৈরি হয়নি। অফিসে যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5">
        <h1 className="text-xl font-semibold">ফি</h1>
        <p className="mt-2 text-3xl font-semibold">
          {formatMoney(data.summary?.due ?? 0, "bn")}
        </p>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          মোট {formatMoney(data.plan.total, "bn")}, জমা{" "}
          {formatMoney(data.summary?.paid ?? 0, "bn")}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white">
        <h2 className="border-b border-[color:var(--border)] px-4 py-3 font-semibold">
          কিস্তি
        </h2>
        <ul className="divide-y divide-[color:var(--border)]">
          {data.plan.installments.map((installment) => (
            <li key={installment.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{installment.label}</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  {formatDate(installment.dueDate, "bn")}
                </p>
              </div>
              <div className="text-end">
                <p className="font-latin font-semibold">
                  {formatMoney(installment.amount, "bn")}
                </p>
                <p
                  className={
                    installment.status === "OVERDUE"
                      ? "text-xs text-[color:var(--error)]"
                      : "text-xs text-[color:var(--muted-foreground)]"
                  }
                >
                  {STATUS[installment.status] ?? installment.status}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {data.payments.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white">
          <h2 className="border-b border-[color:var(--border)] px-4 py-3 font-semibold">
            রসিদ
          </h2>
          <ul className="divide-y divide-[color:var(--border)]">
            {data.payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-latin font-medium">{payment.receiptNo}</p>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {formatDate(payment.paidAt, "bn")}
                  </p>
                </div>
                <p className="font-latin font-semibold">
                  {formatMoney(payment.amount, "bn")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { payTeacher, saveTeacherRate } from "@/app/actions/admin-alerts";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

type Due = {
  facultyId: string;
  name: string;
  sessions: number;
  byType: Record<string, number>;
  amount: number;
  missingRate: boolean;
};

/** What each teacher is owed, with the button that records paying them. */
export function TeacherPayTable({
  dues,
  from,
  to,
  rates,
}: {
  dues: Due[];
  from: string;
  to: string;
  rates: Array<{
    facultyId: string;
    name: string;
    rates: Array<{ type: string; ratePerClass: number }>;
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setRate(facultyId: string, name: string) {
    const raw = window.prompt(`Rate per lecture for ${name}, in Taka`);
    if (raw === null) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a whole number of Taka.");
      return;
    }
    startTransition(async () => {
      const result = await saveTeacherRate({
        facultyId,
        type: "LECTURE",
        ratePerClass: value,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the rate.");
        return;
      }
      toast.success("Rate saved.");
      router.refresh();
    });
  }

  function pay(due: Due) {
    if (
      !window.confirm(
        `Record paying ${due.name} ${formatMoney(due.amount, "en")} for ${due.sessions} classes?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await payTeacher({ facultyId: due.facultyId, from, to });
      if (!result.ok) {
        toast.error(result.error ?? "Could not record the payment.");
        return;
      }
      toast.success("Payment recorded.");
      router.refresh();
    });
  }

  return (
    <Panel padded={false} className="overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <tbody className="divide-y divide-[color:var(--border)]">
          {dues.map((due) => {
            const known = rates.find((rate) => rate.facultyId === due.facultyId);
            return (
              <tr key={due.facultyId}>
                <td className="px-4 py-2.5">
                  {due.name}
                  <span className="block text-xs text-[color:var(--muted-foreground)]">
                    {Object.entries(due.byType)
                      .map(([type, count]) => `${count} ${type.toLowerCase()}`)
                      .join(", ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-latin">
                  {formatMoney(due.amount, "en")}
                  {due.missingRate && (
                    <span className="block">
                      <AdminBadge tone="warning">rate missing</AdminBadge>
                    </span>
                  )}
                  {known && known.rates.length > 0 && (
                    <span className="block text-xs text-[color:var(--muted-foreground)]">
                      {known.rates
                        .map(
                          (rate) =>
                            `${rate.type.toLowerCase()} ${formatMoney(rate.ratePerClass, "en")}`,
                        )
                        .join(" · ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setRate(due.facultyId, due.name)}
                    >
                      Set rate
                    </Button>
                    <Button
                      type="button"
                      variant="brand"
                      size="sm"
                      disabled={pending || due.missingRate || due.amount === 0}
                      onClick={() => pay(due)}
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <BadgeDollarSign className="size-4" aria-hidden="true" />
                      )}
                      Pay
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

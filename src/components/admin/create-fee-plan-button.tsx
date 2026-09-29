"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { createFeePlan } from "@/app/actions/admin-fees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";

/**
 * Builds the plan from the course price: half at admission, the balance
 * monthly. The office can change the number of instalments and give a
 * discount here; everything stays editable afterwards.
 */
export function CreateFeePlanButton({
  studentId,
  courseFee,
  months,
}: {
  studentId: string;
  courseFee: number;
  months: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [instalments, setInstalments] = useState(String(months));
  const [discount, setDiscount] = useState("0");
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <Button type="button" variant="brand" size="cta" onClick={() => setOpen(true)}>
        <Wallet className="size-4" aria-hidden="true" />
        Create the fee plan
      </Button>
    );
  }

  return (
    <div className="mx-auto grid max-w-xl gap-4 text-start sm:grid-cols-3">
      <div>
        <Label htmlFor="plan-instalments">Monthly instalments</Label>
        <Input
          id="plan-instalments"
          value={instalments}
          onChange={(event) => setInstalments(event.target.value)}
          inputMode="numeric"
          className="mt-1 h-11 font-latin"
        />
      </div>
      <div>
        <Label htmlFor="plan-discount">Discount (Taka)</Label>
        <Input
          id="plan-discount"
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          inputMode="numeric"
          className="mt-1 h-11 font-latin"
        />
      </div>
      <div>
        <Label htmlFor="plan-reason">Reason</Label>
        <Input
          id="plan-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Sibling, staff, board topper"
          className="mt-1 h-11"
        />
      </div>
      <p className="text-sm text-[color:var(--muted-foreground)] sm:col-span-3">
        Course fee {formatMoney(courseFee, "en")}, plus exam, form and book fees
        where the course has them. Half falls due at admission and the rest on the
        first of each month.
      </p>
      <div className="flex gap-2 sm:col-span-3">
        <Button
          type="button"
          variant="brand"
          size="cta"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await createFeePlan({
                studentId,
                instalments: Number(instalments) || 0,
                discount: Number(discount) || 0,
                discountReason: reason,
              });
              if (!result.ok) {
                toast.error(result.error ?? "Could not create the plan.");
                return;
              }
              toast.success("Fee plan created.");
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Create
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

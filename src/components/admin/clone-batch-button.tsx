"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cloneBatch } from "@/app/actions/admin-batches";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Clone" row action on the batches list (addendum 2, A2). Copies the class
 * days, times, seat count and note into a fresh UPCOMING batch with an empty
 * seat counter.
 */
export function CloneBatchButton({
  batchId,
  batchName,
}: {
  batchId: string;
  batchName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      setErrors({});
      const result = await cloneBatch(batchId, {
        name: String(form.get("name") ?? ""),
        startDate: String(form.get("startDate") ?? ""),
        seats: String(form.get("seats") ?? ""),
      });

      if (result.ok) {
        toast.success("ব্যাচটি কপি করা হয়েছে।");
        setOpen(false);
        router.push(`/admin/batches/${result.id}`);
        router.refresh();
        return;
      }

      if (result.errors) setErrors(result.errors);
      else toast.error(result.error ?? "কপি করা যায়নি।");
    });
  }

  // Suggest next year's session name: "DMU Batch, Session 2026" -> "… 2027".
  const suggestedName = batchName.replace(/(\d{4})/, (year) =>
    String(Number(year) + 1),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="ব্যাচ কপি করুন">
          <Copy className="size-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>ব্যাচ কপি করুন</DialogTitle>
            <DialogDescription>
              “{batchName}” থেকে ক্লাসের দিন, সময়, আসন সংখ্যা ও নোট কপি করা হবে। নতুন
              ব্যাচটি “আসন্ন” অবস্থায় তৈরি হবে এবং পূর্ণ আসন ০ থেকে শুরু হবে।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="clone-name">নতুন ব্যাচের নাম</Label>
              <Input
                id="clone-name"
                name="name"
                defaultValue={suggestedName}
                required
                className="h-11"
              />
              {errors.name && (
                <p className="text-xs font-medium text-[color:var(--error)]">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clone-start">শুরুর তারিখ</Label>
                <Input
                  id="clone-start"
                  name="startDate"
                  type="date"
                  dir="ltr"
                  className="h-11 font-latin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clone-seats">মোট আসন</Label>
                <Input
                  id="clone-seats"
                  name="seats"
                  type="number"
                  min={0}
                  dir="ltr"
                  placeholder="আগের মতোই"
                  className="h-11 font-latin"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="cta">
                বাতিল
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" size="cta" disabled={pending}>
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              কপি করুন
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

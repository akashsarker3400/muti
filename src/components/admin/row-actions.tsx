"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

/** Edit link plus a confirming delete button, used by every admin list. */
export function RowActions({
  editHref,
  onDelete,
  label,
}: {
  editHref: string;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await onDelete();
      if (result.ok) {
        toast.success("Deleted.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not delete.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
        <Link href={editHref}>
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2 className="size-4 text-[color:var(--error)]" aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete?</DialogTitle>
            <DialogDescription>
              “{label}” will be deleted permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="cta" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="cta"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

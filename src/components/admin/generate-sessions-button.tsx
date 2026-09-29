"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { generateSessions } from "@/app/actions/admin-attendance";
import { Button } from "@/components/ui/button";

/**
 * Writes one class per routine row. Safe to press again: rows that already
 * have a class are skipped, so a course whose routine grew gains only the new
 * classes and the dates already fixed are left alone.
 */
export function GenerateSessionsButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="brand"
      size="cta"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await generateSessions(batchId);
          if (!result.ok) {
            toast.error(result.error ?? "Could not create the classes.");
            return;
          }
          toast.success(
            result.created
              ? `${result.created} class${result.created === 1 ? "" : "es"} added.`
              : "Every routine row already has a class.",
          );
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <CalendarPlus className="size-4" aria-hidden="true" />
      )}
      Generate from routine
    </Button>
  );
}

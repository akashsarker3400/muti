"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { restoreDefaultTemplates } from "@/app/actions/admin-messages";
import { Button } from "@/components/ui/button";

/**
 * Writes back any built-in template the office does not have.
 *
 * Existing rows are never touched, so pressing it after editing the wording
 * is safe: it only ever adds what is missing.
 */
export function RestoreTemplatesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="cta"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await restoreDefaultTemplates();
          toast.success(
            result.added
              ? `${result.added} template${result.added === 1 ? "" : "s"} added.`
              : "Every built-in template is already there.",
          );
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <RotateCcw className="size-4" aria-hidden="true" />
      )}
      Restore built-in templates
    </Button>
  );
}

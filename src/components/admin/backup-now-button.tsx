"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { runBackupNow } from "@/app/actions/admin-backup";
import { Button } from "@/components/ui/button";

/** Makes a dump straight away, which is also how the office tests the setup. */
export function BackupNowButton() {
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
          const result = await runBackupNow();
          if (!result.ok) {
            toast.error(result.error ?? "The backup did not run.");
            return;
          }
          toast.success("Backup taken.");
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <DatabaseBackup className="size-4" aria-hidden="true" />
      )}
      Back up now
    </Button>
  );
}

"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";

/**
 * Inline publish / active toggle for list rows. Optimistic so the switch
 * reacts immediately, and it rolls back automatically if the action fails.
 */
export function FlagToggle({
  value,
  label,
  onToggle,
}: {
  value: boolean;
  label: string;
  onToggle: (next: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(value);

  return (
    <Switch
      checked={optimistic}
      aria-label={label}
      disabled={pending}
      onCheckedChange={(next) => {
        startTransition(async () => {
          setOptimistic(next);
          const result = await onToggle(next);
          if (!result.ok) {
            toast.error(result.error ?? "পরিবর্তন করা যায়নি।");
          }
          router.refresh();
        });
      }}
    />
  );
}

"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setApplicationStatus } from "@/app/actions/admin-applications";
import { cn } from "cn";

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  NEW: "নতুন",
  CONTACTED: "যোগাযোগ হয়েছে",
  ADMITTED: "ভর্তি হয়েছে",
  CLOSED: "বন্ধ",
};

const TONE: Record<string, string> = {
  NEW: "border-[color:var(--accent-red)]/30 bg-[color:var(--accent-red)]/8 text-[color:var(--accent-red-ink)]",
  CONTACTED:
    "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-[color:var(--warning-ink)]",
  ADMITTED:
    "border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[color:var(--success-ink)]",
  CLOSED:
    "border-[color:var(--border)] bg-[color:var(--bg-soft)] text-[color:var(--muted-foreground)]",
};

/** Inline status dropdown used in the dashboard and the applications list. */
export function ApplicationStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);

  return (
    <select
      value={optimistic}
      disabled={pending}
      aria-label="আবেদনের অবস্থা"
      onChange={(event) => {
        const next = event.target.value;
        startTransition(async () => {
          setOptimistic(next);
          const result = await setApplicationStatus(id, next);
          if (!result.ok) toast.error(result.error ?? "পরিবর্তন করা যায়নি।");
          router.refresh();
        });
      }}
      className={cn(
        "h-9 rounded-lg border px-2 text-xs font-semibold outline-none",
        TONE[optimistic] ?? TONE.CLOSED,
      )}
    >
      {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

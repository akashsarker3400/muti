import { CalendarCheck, CalendarX } from "lucide-react";

import type { OpenState } from "@/lib/health-schedule";

/** "Open today / closed today" pill for the schedule card and the homepage band. */
export function OpenBadge({
  state,
  labels,
}: {
  state: OpenState;
  labels: { open: string; closed: string };
}) {
  if (state === "unknown") return null;
  const open = state === "open";
  const Icon = open ? CalendarCheck : CalendarX;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        open
          ? "bg-[color:var(--success)] text-white"
          : "bg-[color:var(--muted-foreground)] text-white"
      }`}
      data-testid="health-open-badge"
      data-state={state}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {open ? labels.open : labels.closed}
    </span>
  );
}

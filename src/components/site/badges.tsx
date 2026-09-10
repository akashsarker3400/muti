import { BadgeCheck } from "lucide-react";

import { cn } from "cn";

/** "ভর্তি চলছে / Admission Open" red pill (section 4). */
export function AdmissionBadge({
  open,
  labelOpen,
  labelClosed,
  className,
}: {
  open: boolean;
  labelOpen: string;
  labelClosed: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        open
          ? "bg-[color:var(--accent-red)] text-white"
          : "bg-[color:var(--bg-soft)] text-[color:var(--muted-foreground)]",
        className,
      )}
    >
      {open ? labelOpen : labelClosed}
    </span>
  );
}

/** "Govt. Approved" navy pill with a check icon (section 4). */
export function GovtBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[color:var(--brand)] px-2.5 py-1 text-xs font-semibold text-white",
        className,
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LevelBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand)]",
        className,
      )}
    >
      {label}
    </span>
  );
}

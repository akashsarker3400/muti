import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

/** Page title row with an optional primary action. */
export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-[color:var(--brand)] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function NewButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="brand" size="cta">
      <Link href={href}>
        <Plus className="size-4" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}

/** White surface used for tables, forms and dashboard cards. */
export function Panel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-[color:var(--border)] bg-white p-10 text-center">
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const body = (
    <Panel className="h-full transition hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--muted-foreground)]">{label}</p>
          <p className="nums mt-1 text-2xl font-bold text-[color:var(--brand)]">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
            <Icon className="size-5" />
          </span>
        )}
      </div>
    </Panel>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

const BADGE_TONES = {
  neutral: "bg-[color:var(--bg-soft)] text-[color:var(--muted-foreground)]",
  brand: "bg-[color:var(--brand)]/10 text-[color:var(--brand)]",
  success: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
  danger: "bg-[color:var(--error)]/10 text-[color:var(--error)]",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

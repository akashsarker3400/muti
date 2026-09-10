"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "cn";

/**
 * Small form primitives shared by the three public forms. They keep the label,
 * the required marker, the hint and the error message wired together for
 * screen readers without pulling in a whole form abstraction.
 */
export function Field({
  label,
  required = false,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-[color:var(--accent-red)]" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-[color:var(--muted-foreground)]">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--error)]"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Off-screen input that only bots fill in (section 5.6). Spread a
 * react-hook-form registration into it: `<Honeypot {...register("website")} />`.
 */
export function Honeypot(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="muti-website">Website</label>
      <input
        id="muti-website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...props}
      />
    </div>
  );
}

/** Shared control classes so inputs, selects and textareas match. */
export const selectClass =
  "h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/**
 * Maps a validation key (from zod on the server, or a react-hook-form rule)
 * onto the localised message in the `form.errors` namespace.
 */
export function errorText(t: (key: string) => string, key: string): string {
  try {
    return t(`errors.${key}`);
  } catch {
    return t("errors.generic");
  }
}

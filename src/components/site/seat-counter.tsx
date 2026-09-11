import { Armchair, Flame } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { seatsLeftLabel, seatState, type SeatFields } from "@/lib/seats";
import { cn } from "cn";

/**
 * Live seat counter badge (addendum 2, A1). Renders nothing when the batch has
 * no seat count or the admin switched the counter off — an unknown capacity is
 * never dressed up as scarcity.
 */
export async function SeatCounter({
  batch,
  locale,
  className,
  onDark = false,
}: {
  batch: SeatFields | null | undefined;
  locale: Locale;
  className?: string;
  /** Used on the navy "next batch" panel, where the light tints disappear. */
  onDark?: boolean;
}) {
  const state = seatState(batch);
  if (!state.show) return null;

  const t = await getTranslations("seats");

  if (state.full) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          onDark
            ? "bg-white/15 text-white"
            : "bg-[color:var(--bg-soft)] text-[color:var(--muted-foreground)]",
          className,
        )}
      >
        <Armchair className="size-3.5" aria-hidden="true" />
        {t("full")}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        state.urgent
          ? onDark
            ? "bg-[color:var(--highlight)] text-[color:var(--brand-dark)]"
            : "bg-[color:var(--accent-red)]/10 text-[color:var(--accent-red-ink)]"
          : onDark
            ? "bg-white/15 text-white"
            : "bg-[color:var(--success)]/12 text-[color:var(--success-ink)]",
        className,
      )}
    >
      {state.urgent ? (
        <Flame className="size-3.5" aria-hidden="true" />
      ) : (
        <Armchair className="size-3.5" aria-hidden="true" />
      )}
      {seatsLeftLabel(state.seatsLeft, locale)}
      {state.urgent && <span className="font-bold">· {t("hurry")}</span>}
    </span>
  );
}

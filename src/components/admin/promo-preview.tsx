"use client";

import { useState } from "react";

import { PromoSlot } from "@/components/site/home/promo-slot";
import type { FormValues } from "@/lib/admin/fields";
import { cn } from "cn";

const WIDTHS = [
  { key: "desktop", label: "Desktop 1200px", width: 1200 },
  { key: "mobile", label: "Phone 390px", width: 390 },
] as const;

/**
 * Live preview of the promo being edited, at desktop and phone widths, using
 * the same component the homepage renders. Slot B is shown at its column
 * width (360px) on desktop.
 */
export function PromoPreview({ values }: { values: FormValues }) {
  const [which, setWhich] = useState<(typeof WIDTHS)[number]["key"]>("desktop");
  const image = String(values.image ?? "");
  if (!image) {
    return (
      <p className="rounded-lg border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--muted-foreground)]">
        Upload the poster to see the preview.
      </p>
    );
  }
  const slot = values.slot === "PROMO_B" ? "PROMO_B" : "PROMO_A";
  const width = which === "desktop" ? (slot === "PROMO_B" ? 360 : 1200) : 390;
  const promo = {
    id: "preview",
    title: String(values.title ?? "Preview"),
    image,
    mobileImage: String(values.mobileImage ?? "") || null,
    link: null,
    openInNewTab: false,
    isOffer: Boolean(values.isOffer),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Preview</h2>
        <div className="flex rounded-lg border border-[color:var(--border)] p-0.5">
          {WIDTHS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWhich(option.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                which === option.key
                  ? "bg-[color:var(--brand)] text-white"
                  : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--bg-soft)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl bg-[color:var(--bg-soft)] p-4">
        {/* The phone frame forces the `sm:` breakpoint off by being narrower than 640px. */}
        <div style={{ width }} className="mx-auto max-w-full">
          <PromoSlot
            key={`${which}-${slot}-${image}-${promo.mobileImage ?? ""}`}
            slot={slot}
            promos={[promo]}
            labels={{ offer: "Offer", slide: "Promo" }}
          />
        </div>
      </div>
      <p className="text-xs text-[color:var(--muted-foreground)]">
        The phone preview shows the phone poster when one is uploaded. Slot A is capped
        at 320px tall on phones.
      </p>
    </div>
  );
}

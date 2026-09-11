"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { trackPromoClick, type PromoItem } from "@/components/site/home/promo-slot";

const COOKIE = "muti_promo_seen";
const DAYS = 7;

function seen(id: string): boolean {
  try {
    return document.cookie.split("; ").some((c) => c === `${COOKIE}=${id}`);
  } catch {
    return false;
  }
}

function remember(id: string) {
  try {
    document.cookie = `${COOKIE}=${id}; max-age=${DAYS * 24 * 60 * 60}; path=/; samesite=lax`;
  } catch {
    // Without cookies the popup simply shows again next time.
  }
}

/**
 * One-time promo popup (homepage additions, 1): shown once per visitor per
 * promo, remembered for seven days. Lives in the public layout only, so it
 * can never appear on admin pages.
 */
export function PromoPopup({
  promo,
  labels,
}: {
  promo: PromoItem;
  labels: { close: string; offer: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (seen(promo.id)) return;
    // A short delay lets the page settle before the modal appears.
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [promo.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    remember(promo.id);
    setOpen(false);
  }

  if (!open) return null;

  const picture = (
    <span className="relative block aspect-[4/5] w-full sm:aspect-square">
      <Image
        src={promo.mobileImage ?? promo.image}
        alt={promo.title}
        fill
        sizes="(min-width: 640px) 480px, 100vw"
        className="object-cover"
        priority
      />
      {promo.isOffer && (
        <span className="absolute start-3 top-3 rounded-full bg-[color:var(--accent-red)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {labels.offer}
        </span>
      )}
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      onClick={close}
      role="presentation"
      data-testid="promo-popup"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={promo.title}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label={labels.close}
          className="absolute end-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 text-[color:var(--foreground)] shadow hover:bg-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {promo.link ? (
          <a
            href={promo.link}
            target={promo.openInNewTab ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={() => {
              trackPromoClick(promo.id);
              remember(promo.id);
            }}
            className="block"
          >
            {picture}
          </a>
        ) : (
          picture
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import useEmblaCarousel from "embla-carousel-react";

import { cn } from "cn";

export type PromoItem = {
  id: string;
  title: string;
  image: string;
  mobileImage: string | null;
  link: string | null;
  openInNewTab: boolean;
  isOffer: boolean;
};

/** Fires the click counter without delaying navigation. */
export function trackPromoClick(id: string) {
  try {
    const body = new Blob([JSON.stringify({ id })], { type: "application/json" });
    if (!navigator.sendBeacon("/api/promo/click", body)) {
      void fetch("/api/promo/click", { method: "POST", body, keepalive: true });
    }
  } catch {
    // Counting is best effort; the link still opens.
  }
}

const ASPECT = {
  PROMO_A: "aspect-[8/3] max-h-[320px] sm:max-h-none",
  PROMO_B: "aspect-square",
} as const;

const SIZES = {
  PROMO_A: "(min-width: 1280px) 1200px, 100vw",
  PROMO_B: "(min-width: 1024px) 360px, 100vw",
} as const;

/** One poster: image only, rounded, with the optional "Offer" tag. */
function PromoCard({
  promo,
  slot,
  labels,
  priority = false,
}: {
  promo: PromoItem;
  slot: keyof typeof ASPECT;
  labels: { offer: string };
  priority?: boolean;
}) {
  // With a separate phone poster, both images are in the DOM and CSS picks
  // one, so the browser only downloads the visible size.
  const picture = (
    <>
      <Image
        src={promo.mobileImage ?? promo.image}
        alt={promo.title}
        fill
        sizes={SIZES[slot]}
        priority={priority}
        className={cn("object-cover", promo.mobileImage && "sm:hidden")}
      />
      {promo.mobileImage && (
        <Image
          src={promo.image}
          alt=""
          fill
          sizes={SIZES[slot]}
          priority={priority}
          className="hidden object-cover sm:block"
        />
      )}
      {promo.isOffer && (
        <span className="absolute start-3 top-3 rounded-full bg-[color:var(--accent-red)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {labels.offer}
        </span>
      )}
    </>
  );

  const className = cn(
    "relative block w-full overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] shadow-[var(--shadow-card)]",
    ASPECT[slot],
  );

  if (!promo.link) {
    return (
      <div className={className} data-promo={promo.id}>
        {picture}
      </div>
    );
  }
  const external = /^https?:\/\//.test(promo.link);
  return (
    <a
      href={promo.link}
      target={promo.openInNewTab ? "_blank" : undefined}
      rel={promo.openInNewTab || external ? "noopener noreferrer" : undefined}
      onClick={() => trackPromoClick(promo.id)}
      className={cn(
        className,
        "transition hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:outline-none",
      )}
      data-promo={promo.id}
    >
      {picture}
    </a>
  );
}

/**
 * A promo slot (homepage additions, 1). One poster, or a fading rotation
 * every six seconds with dots when several are active. Renders nothing at
 * all when the list is empty, so the section collapses.
 */
export function PromoSlot({
  slot,
  promos,
  labels,
  className,
}: {
  slot: "PROMO_A" | "PROMO_B";
  promos: PromoItem[];
  labels: { offer: string; slide: string };
  className?: string;
}) {
  const many = promos.length > 1;
  const [ref, api] = useEmblaCarousel({ loop: true, active: many }, [
    Fade(),
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (api) setSelected(api.selectedScrollSnap());
  }, [api]);
  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  if (promos.length === 0) return null;

  if (!many) {
    return (
      <div className={className} data-testid={`promo-${slot}`}>
        <PromoCard promo={promos[0]!} slot={slot} labels={labels} />
      </div>
    );
  }

  return (
    <div className={className} data-testid={`promo-${slot}`} data-selected={selected}>
      <div ref={ref} className="overflow-hidden rounded-[14px]">
        <div className="flex">
          {promos.map((promo, index) => (
            <div key={promo.id} className="min-w-0 flex-[0_0_100%]">
              <PromoCard
                promo={promo}
                slot={slot}
                labels={labels}
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5" role="tablist">
        {promos.map((promo, index) => (
          <button
            key={promo.id}
            type="button"
            role="tab"
            aria-selected={index === selected}
            aria-label={`${labels.slide} ${index + 1}`}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              index === selected
                ? "w-5 bg-[color:var(--brand)]"
                : "w-2 bg-[color:var(--brand)]/25 hover:bg-[color:var(--brand)]/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}

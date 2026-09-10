"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export type TestimonialItem = {
  id: string;
  name: string;
  batch: string | null;
  course: string | null;
  text: string;
  photo: string | null;
  rating: number;
};

/**
 * Scroll-snap carousel (section 5.1 item 10). It is a plain horizontally
 * scrollable list, so it works with touch, trackpad and keyboard even before
 * hydration; the arrows only scroll it further.
 */
export function TestimonialsCarousel({ items }: { items: TestimonialItem[] }) {
  const common = useTranslations("common");
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setAtStart(track.scrollLeft <= 4);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
  }, [sync, items.length]);

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const amount = card ? card.clientWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={sync}
        className="-mx-1 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-1 pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="flex w-[85%] shrink-0 snap-start flex-col rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:w-[48%] lg:w-[32%]"
          >
            <Quote
              className="size-6 text-[color:var(--highlight)]"
              aria-hidden="true"
            />
            <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-[color:var(--foreground)]">
              {item.text}
            </p>

            {item.rating > 0 && (
              <p className="mt-4 flex gap-0.5" aria-label={`${item.rating} / 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={
                      i < item.rating
                        ? "size-4 fill-[color:var(--highlight)] text-[color:var(--highlight)]"
                        : "size-4 text-[color:var(--border)]"
                    }
                    aria-hidden="true"
                  />
                ))}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3 border-t border-[color:var(--border)] pt-4">
              {item.photo ? (
                <Image
                  src={item.photo}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-full bg-[color:var(--brand-soft)] text-sm font-semibold text-[color:var(--brand)]"
                >
                  {item.name.trim().charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                {(item.course || item.batch) && (
                  <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                    {[item.course, item.batch].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {items.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-cta"
            onClick={() => scrollBy(-1)}
            disabled={atStart}
            aria-label={common("previous")}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-cta"
            onClick={() => scrollBy(1)}
            disabled={atEnd}
            aria-label={common("next")}
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

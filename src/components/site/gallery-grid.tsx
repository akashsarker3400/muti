"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export type GalleryItem = {
  id: string;
  url: string;
  caption: string | null;
  album?: string | null;
};

/**
 * Responsive thumbnail grid with a keyboard-navigable lightbox (section 5.13).
 * Built on a plain dialog element rather than a modal library so that arrow
 * keys, Escape and focus behave predictably.
 */
export function GalleryGrid({
  items,
  columns = 4,
}: {
  items: GalleryItem[];
  columns?: 3 | 4;
}) {
  const common = useTranslations("common");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + direction + items.length) % items.length;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    }

    document.addEventListener("keydown", onKey);
    // Prevent the page behind the lightbox from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, move]);

  if (items.length === 0) return null;

  const active = openIndex === null ? null : items[openIndex];

  return (
    <>
      <ul
        className={`grid gap-3 ${
          columns === 3
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-soft)]"
            >
              <Image
                src={item.url}
                alt={item.caption ?? ""}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? common("close")}
          className="fixed inset-0 z-[70] flex flex-col bg-black/90 p-3 sm:p-6"
          onClick={close}
        >
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-cta"
              onClick={close}
              aria-label={common("close")}
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <X className="size-6" aria-hidden="true" />
            </Button>
          </div>

          <div className="relative flex-1" onClick={(event) => event.stopPropagation()}>
            <Image
              src={active.url}
              alt={active.caption ?? ""}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <div
            className="flex items-center justify-between gap-4 pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-cta"
              onClick={() => move(-1)}
              aria-label={common("previous")}
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <ChevronLeft className="size-6 rtl:rotate-180" aria-hidden="true" />
            </Button>

            <p className="min-w-0 flex-1 text-center text-sm text-white/85">
              {active.caption}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="icon-cta"
              onClick={() => move(1)}
              aria-label={common("next")}
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <ChevronRight className="size-6 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

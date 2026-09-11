"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { cn } from "cn";

/**
 * Cross-fading hero slideshow. Every slide is stacked in the same box and
 * only the active one is opaque, so a change is a fade rather than a jump
 * and the box never changes height.
 *
 * It advances on its own every `intervalSeconds`, pauses while the reader
 * hovers or focuses it, and never auto-advances for people who asked for
 * reduced motion — they still get the dots. With one image it is simply
 * that image.
 */
export function HeroSlideshow({
  images,
  alt,
  intervalSeconds,
  className,
  dotLabels,
}: {
  images: string[];
  alt: string;
  intervalSeconds: number;
  className?: string;
  /** Accessible name per dot, e.g. "ছবি ১" — one entry per image. */
  dotLabels: string[];
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const autoplay =
    images.length > 1 && intervalSeconds > 0 && !paused && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % images.length),
      intervalSeconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [autoplay, images.length, intervalSeconds]);

  return (
    <div
      className={cn("group relative overflow-hidden rounded-2xl", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-testid="hero-slideshow"
      data-active={active}
    >
      {images.map((src, index) => (
        <Image
          key={`${src}-${index}`}
          src={src}
          alt={index === active ? alt : ""}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          // The first slide is the LCP image; the rest can arrive lazily.
          priority={index === 0}
          aria-hidden={index !== active}
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {images.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
          role="tablist"
          aria-label={alt}
        >
          {images.map((src, index) => (
            <button
              key={`${src}-${index}-dot`}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={dotLabels[index] ?? String(index + 1)}
              onClick={() => setActive(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === active ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/90",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

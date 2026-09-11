"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { WhatsAppIcon } from "@/components/site/icons";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "cn";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  mobileImage: string;
  overlay: number;
  textPosition: "LEFT" | "CENTER";
  cta: { label: string; href: string } | null;
  cta2: { label: string; href: string; whatsapp: boolean } | null;
};

export type HeroSliderSettings = {
  autoplay: boolean;
  intervalMs: number;
  transition: "FADE" | "SLIDE";
  showDots: boolean;
  showArrows: boolean;
  pauseOnHover: boolean;
  heightDesktop: number;
  heightMobile: number;
};

/**
 * Full-bleed hero carousel (addendum 3, §6) on embla. The section reserves
 * its height in CSS before any image arrives, so the page never jumps; the
 * first slide's image is the LCP candidate and loads with priority.
 *
 * Autoplay pauses on hover (if set), while the tab is hidden, and is off
 * entirely for readers who asked for reduced motion — they keep the dots
 * and arrows.
 */
export function HeroSlider({
  slides,
  settings,
  labels,
}: {
  slides: HeroSlide[];
  settings: HeroSliderSettings;
  labels: { previous: string; next: string; slide: string[] };
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const autoplayOn = settings.autoplay && slides.length > 1 && !reducedMotion;

  const plugins = [
    ...(settings.transition === "FADE" ? [Fade()] : []),
    ...(autoplayOn
      ? [
          Autoplay({
            delay: settings.intervalMs,
            stopOnInteraction: false,
            stopOnMouseEnter: settings.pauseOnHover,
            stopOnFocusIn: true,
          }),
        ]
      : []),
  ];

  const [viewportRef, embla] = useEmblaCarousel(
    { loop: slides.length > 1, duration: reducedMotion ? 0 : 25 },
    plugins,
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla]);

  // A hidden tab should not burn through slides the reader never sees.
  useEffect(() => {
    if (!embla) return;
    const autoplay = embla.plugins().autoplay;
    if (!autoplay) return;
    const onVisibility = () => (document.hidden ? autoplay.stop() : autoplay.play());
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [embla]);

  const scrollTo = useCallback((index: number) => embla?.scrollTo(index), [embla]);

  return (
    <section
      className="hero-slider group relative w-full overflow-hidden bg-[color:var(--brand-dark)] text-white"
      style={
        {
          "--hero-h-desktop": `${settings.heightDesktop}px`,
          "--hero-h-mobile": `${settings.heightMobile}px`,
        } as React.CSSProperties
      }
      aria-roledescription="carousel"
      data-testid="hero-slider"
      data-selected={selected}
    >
      <div
        ref={viewportRef}
        className="h-[var(--hero-h-mobile)] md:h-[var(--hero-h-desktop)]"
      >
        <div className="flex h-full touch-pan-y">
          {slides.map((slide, index) => (
            <Slide
              key={slide.id}
              slide={slide}
              first={index === 0}
              active={index === selected}
              label={labels.slide[index] ?? String(index + 1)}
            />
          ))}
        </div>
      </div>

      {settings.showArrows && slides.length > 1 && (
        <>
          <ArrowButton
            side="start"
            label={labels.previous}
            onClick={() => embla?.scrollPrev()}
          />
          <ArrowButton
            side="end"
            label={labels.next}
            onClick={() => embla?.scrollNext()}
          />
        </>
      )}

      {settings.showDots && slides.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-4 flex justify-center gap-2"
          role="tablist"
          aria-label={labels.slide.join(", ")}
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === selected}
              aria-label={labels.slide[index] ?? String(index + 1)}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === selected
                  ? "w-7 bg-white"
                  : "w-2.5 bg-white/55 hover:bg-white/90",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Slide({
  slide,
  first,
  active,
  label,
}: {
  slide: HeroSlide;
  first: boolean;
  active: boolean;
  label: string;
}) {
  const Heading = first ? "h1" : "h2";
  const centered = slide.textPosition === "CENTER";
  // The admin "overlay" number scales the scrim: 40 is the designed strength,
  // clamped so a slide can be softened to 20% or hardened to 100%, never more.
  const strength = Math.min(1, Math.max(0.2, slide.overlay / 40));
  const scrim = scrimFor(slide.textPosition, strength);

  return (
    <article
      className="hero-scrim relative h-full min-w-0 flex-[0_0_100%]"
      style={
        {
          "--hero-scrim-desktop": scrim.desktop,
          "--hero-scrim-mobile": scrim.mobile,
        } as React.CSSProperties
      }
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={!active}
    >
      {slide.image ? (
        <>
          {/* Mobile art (square) when provided; the desktop image otherwise. */}
          <Image
            src={slide.mobileImage || slide.image}
            alt=""
            fill
            priority={first}
            sizes="100vw"
            className={cn("object-cover", slide.mobileImage && "md:hidden")}
          />
          {slide.mobileImage && (
            <Image
              src={slide.image}
              alt=""
              fill
              priority={first}
              sizes="100vw"
              className="hidden object-cover md:block"
            />
          )}
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_color-mix(in_srgb,var(--brand)_70%,white)_0%,_var(--brand)_45%,_var(--brand-dark)_100%)]"
        />
      )}

      {/*
        Directional scrim (hero readability fix): a navy gradient painted by
        the .hero-scrim::before pseudo-element — left→right on desktop so the
        text side is dark and the photo's subject stays clear, top→bottom on
        phones where the text sits low. The image is never blurred.
      */}
      <div
        className={cn(
          "container-content relative z-[2] flex h-full flex-col justify-end py-6 md:justify-center md:py-10",
          centered ? "items-center text-center" : "items-start text-start",
        )}
      >
        <div className={cn("relative max-w-[560px] p-6", centered && "mx-auto")}>
          <Heading className="text-[clamp(1.6rem,4.2vw,3rem)] leading-[1.2] font-bold text-balance !text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
            {slide.title}
          </Heading>
          {slide.subtitle && (
            <p className="mt-3 text-[clamp(0.95rem,1.8vw,1.25rem)] leading-relaxed text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
              {slide.subtitle}
            </p>
          )}
          {(slide.cta || slide.cta2) && (
            <div
              className={cn(
                "mt-6 flex flex-wrap gap-3",
                centered ? "justify-center" : "justify-start",
              )}
            >
              {slide.cta && (
                <Cta href={slide.cta.href} variant="accent" active={active}>
                  {slide.cta.label}
                </Cta>
              )}
              {slide.cta2 && (
                <Cta href={slide.cta2.href} variant="whatsapp" active={active}>
                  {slide.cta2.whatsapp && <WhatsAppIcon className="size-5" />}
                  {slide.cta2.label}
                </Cta>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * `Button asChild` merges its classes into the direct child, so the anchor
 * must be that child — a wrapper component would swallow the styling.
 */
function Cta({
  href,
  variant,
  active,
  children,
}: {
  href: string;
  variant: "accent" | "whatsapp";
  active: boolean;
  children: React.ReactNode;
}) {
  const external = /^(https?:|mailto:|tel:)/i.test(href);
  return (
    <Button asChild variant={variant} size="cta-lg">
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={active ? 0 : -1}
        >
          {children}
        </a>
      ) : (
        <Link href={href} tabIndex={active ? 0 : -1}>
          {children}
        </Link>
      )}
    </Button>
  );
}

/**
 * Scrim gradients as CSS strings. The alpha stops are the designed values
 * multiplied by the per-banner strength. LEFT darkens the text side; CENTER
 * darkens symmetrically around the middle. Phones always fade top→bottom.
 */
function scrimFor(position: "LEFT" | "CENTER", strength: number) {
  const navy = (alpha: number) => `rgba(18,32,79,${(alpha * strength).toFixed(3)})`;
  return {
    desktop:
      position === "CENTER"
        ? `radial-gradient(ellipse at center, ${navy(0.8)} 0%, ${navy(0.6)} 45%, ${navy(0.2)} 100%)`
        : `linear-gradient(90deg, ${navy(0.88)} 0%, ${navy(0.72)} 35%, ${navy(0.25)} 60%, ${navy(0)} 85%)`,
    mobile: `linear-gradient(180deg, ${navy(0.35)} 0%, ${navy(0.85)} 70%)`,
  };
}

function ArrowButton({
  side,
  label,
  onClick,
}: {
  side: "start" | "end";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-white md:grid",
        side === "start" ? "start-4" : "end-4",
      )}
    >
      <Icon className="size-6 rtl:rotate-180" aria-hidden="true" />
    </button>
  );
}

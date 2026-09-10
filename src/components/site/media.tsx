import Image from "next/image";

import { cn } from "cn";

/**
 * Every image on the public site is admin-uploaded and therefore optional.
 * When a path is missing we render a calm branded panel instead of a broken
 * image — the real photos drop in from the admin Media library later.
 */
export function SiteImage({
  src,
  alt,
  className,
  imageClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  placeholderLabel,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  placeholderLabel?: string;
}) {
  if (!src?.trim()) {
    return (
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--brand-soft)]",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ScanPattern />
        {placeholderLabel && (
          <p className="relative z-10 px-6 text-center text-sm font-medium text-[color:var(--brand)]/70">
            {placeholderLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}

/** Abstract ultrasound-sweep pattern used behind image placeholders. */
function ScanPattern() {
  return (
    <svg
      className="absolute inset-0 size-full opacity-[0.18]"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="muti-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2A6B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1B2A6B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M200 20 L360 280 L40 280 Z" fill="url(#muti-scan)" />
      {[60, 110, 160, 210, 260].map((r) => (
        <circle
          key={r}
          cx="200"
          cy="20"
          r={r}
          fill="none"
          stroke="#1B2A6B"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
      ))}
    </svg>
  );
}

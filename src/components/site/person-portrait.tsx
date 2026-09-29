import Image from "next/image";

import { cn } from "cn";

/**
 * One portrait style for every person on the site: faculty, leadership and
 * the advisory board. A soft 4:5 box rather than a circle, because a round
 * mask cuts the top of the head and the shoulders off the office's photos.
 * `object-top` keeps the face in frame when the photo is not centred.
 */
export function PersonPortrait({
  src,
  name,
  width = 128,
  className,
  priority = false,
}: {
  src: string | null;
  name: string;
  /** Box width in pixels; the height follows the 4:5 ratio. */
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  const frame = cn(
    "overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] shadow-sm",
    className,
  );

  if (src) {
    return (
      <span className={cn("block shrink-0", frame)} style={{ width }}>
        <Image
          src={src}
          alt={name}
          width={width}
          height={Math.round((width * 5) / 4)}
          priority={priority}
          className="aspect-[4/5] w-full object-cover object-top"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid aspect-[4/5] shrink-0 place-items-center bg-[color:var(--brand-soft)] font-bold text-[color:var(--brand)]",
        frame,
      )}
      style={{ width, fontSize: Math.max(20, Math.round(width / 4)) }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}

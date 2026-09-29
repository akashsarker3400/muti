"use client";

import { useLayoutEffect, useRef } from "react";

const MIN_SCALE = 0.8;
const STEP = 0.02;

/**
 * Keeps a fixed-size printed sheet on one page. The application form is
 * 210 x 297 mm with overflow hidden; an applicant who fills every address
 * and message field to its limit would otherwise have the signature lines
 * cut off. When the content is taller than the sheet, this shrinks it in
 * small steps with CSS `zoom` (down to 80%) until it fits. A normal form is
 * never touched.
 */
export function FitToPage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = ref.current;
    const sheet = box?.parentElement;
    if (!box || !sheet) return;

    const fit = () => {
      let scale = 1;
      box.style.zoom = "1";
      while (sheet.scrollHeight > sheet.clientHeight + 1 && scale > MIN_SCALE) {
        scale = Math.max(MIN_SCALE, scale - STEP);
        // A percentage height is not scaled by zoom, so the box stays as
        // tall as the sheet and the signatures stay pinned to its foot.
        box.style.zoom = String(scale);
      }
    };

    fit();
    // Photos and web fonts change the height after the first layout.
    const observer = new ResizeObserver(fit);
    for (const child of Array.from(box.children)) observer.observe(child);
    window.addEventListener("beforeprint", fit);
    void document.fonts?.ready.then(fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", fit);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

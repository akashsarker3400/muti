"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Counts one page view, without a cookie (addendum 2, A6).
 *
 * `sendBeacon` where the browser has it, so the request survives the visitor
 * clicking away, and a plain fetch otherwise. Nothing is read from the
 * browser, nothing is stored in it, and a failure is silent: statistics are
 * never worth an error in somebody's console.
 */
export function VisitorBeacon({ locale }: { locale: string }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      locale,
      referrer: document.referrer || null,
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/v1/hit",
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }
      void fetch("/api/v1/hit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // A blocked beacon is a visitor who does not want to be counted, which
      // is a reasonable thing to want.
    }
  }, [pathname, locale]);

  return null;
}

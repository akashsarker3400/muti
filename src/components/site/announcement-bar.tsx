"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import type { SiteSettings } from "@/lib/site-settings";

const COLORS: Record<string, string> = {
  accent: "bg-[color:var(--accent-red)] text-white",
  brand: "bg-[color:var(--brand)] text-white",
  highlight: "bg-[color:var(--highlight)] text-[color:var(--brand-dark)]",
};

/**
 * Admin-controlled bar above the header (section 4). Dismissal is remembered
 * per message text, so a new announcement shows again even if the visitor
 * dismissed the previous one.
 */
export function AnnouncementBar({
  settings,
  locale,
}: {
  settings: SiteSettings;
  locale: Locale;
}) {
  const t = useTranslations("common");
  const text = pick(
    locale,
    settings.homepage.announcementTextBn,
    settings.homepage.announcementTextEn,
  );
  const storageKey = `muti-announcement:${hash(text)}`;

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (!settings.homepage.announcementActive || !text.trim() || dismissed) {
    return null;
  }

  const color = COLORS[settings.homepage.announcementColor] ?? COLORS.accent;
  const link = settings.homepage.announcementLink;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Private browsing — the bar simply reappears next visit.
    }
  }

  return (
    <div className={color}>
      <div className="container-content flex items-center gap-3 py-2">
        <p className="flex-1 text-center text-sm font-medium">
          {link ? (
            isExternal(link) ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {text}
              </a>
            ) : (
              <Link href={link} className="underline underline-offset-2">
                {text}
              </Link>
            )
          ) : (
            text
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="-me-2 grid size-8 shrink-0 place-items-center rounded-md transition hover:bg-black/10"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith("mailto:");
}

/** Tiny stable hash so the dismissal key changes when the message changes. */
function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

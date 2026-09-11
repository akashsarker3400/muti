"use client";

import { useTranslations } from "next-intl";

import { WhatsAppIcon } from "@/components/site/icons";
import { usePathname } from "@/i18n/navigation";
import { cn } from "cn";
import { waLink } from "@/lib/whatsapp";

/**
 * Floating WhatsApp button, bottom-right on every public page (section 4).
 *
 * It lives in the layout so it appears exactly once, and picks the prefilled
 * message from the current path: course pages get "আমি {course} কোর্স সম্পর্কে
 * জানতে চাই", everything else gets the default message from Site Settings.
 */
export function WhatsAppFloat({
  phone,
  defaultMessage,
  courseMessages,
}: {
  phone: string;
  defaultMessage: string;
  /** slug -> prefilled message, built server-side from the published courses. */
  courseMessages: Record<string, string>;
}) {
  const t = useTranslations("common");
  const pathname = usePathname();

  const slug = pathname.match(/^\/courses\/([^/]+)\/?$/)?.[1];
  const message = (slug && courseMessages[slug]) || defaultMessage;
  // Course detail pages have their own sticky WhatsApp button on small
  // screens, so the float would be a duplicate there.
  const hiddenOnMobile = Boolean(slug);

  return (
    <a
      href={waLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp")}
      className={cn(
        "fixed end-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-[color:var(--whatsapp-ink)] text-white shadow-lg transition hover:scale-105 hover:bg-[color-mix(in_oklab,var(--whatsapp-ink),black_12%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--whatsapp-ink)] print:hidden",
        hiddenOnMobile && "hidden md:grid",
      )}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}

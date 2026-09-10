import { getTranslations } from "next-intl/server";

import { WhatsAppIcon } from "@/components/site/icons";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

/**
 * Floating WhatsApp button, bottom-right on every public page (section 4).
 * Course pages override the prefilled text through `message`.
 */
export async function WhatsAppFloat({
  settings,
  locale,
  message,
}: {
  settings: SiteSettings;
  locale: Locale;
  message?: string;
}) {
  const t = await getTranslations("common");
  const text =
    message ??
    pick(
      locale,
      settings.whatsapp.defaultMessageBn,
      settings.whatsapp.defaultMessageEn,
    );

  return (
    <a
      href={waLink(settings.contact.whatsapp, text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp")}
      className="fixed end-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-[color:var(--whatsapp)] text-white shadow-lg transition hover:scale-105 hover:bg-[color-mix(in_oklab,var(--whatsapp),black_12%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--whatsapp)] print:hidden"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}

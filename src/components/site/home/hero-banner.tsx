import { BadgeCheck, CalendarDays, Phone, Stethoscope } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { HeroSlider, type HeroSlide } from "@/components/site/home/hero-slider";
import type { Locale } from "@/i18n/routing";
import { pick, toBanglaDigits } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import type { getBanners } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

type Banner = Awaited<ReturnType<typeof getBanners>>[number];

/**
 * Server side of the hero slider (addendum 3, §6): resolves the bilingual
 * copy, default buttons and WhatsApp links, then renders the trust bar
 * underneath. Only mounted when at least one banner is active — the
 * homepage otherwise keeps the original static hero.
 */
export async function HeroBanner({
  banners,
  settings,
  locale,
}: {
  banners: Banner[];
  settings: SiteSettings;
  locale: Locale;
}) {
  const [common, home] = await Promise.all([
    getTranslations("common"),
    getTranslations("home"),
  ]);

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    pick(
      locale,
      settings.whatsapp.defaultMessageBn,
      settings.whatsapp.defaultMessageEn,
    ),
  );
  const resolveHref = (link: string | null, fallback: string) => {
    const value = (link ?? "").trim();
    if (!value) return fallback;
    return value.toLowerCase() === "whatsapp" ? whatsappHref : value;
  };

  const slides: HeroSlide[] = banners.map((banner) => {
    const ctaLabel = pick(locale, banner.ctaLabelBn, banner.ctaLabelEn);
    const cta2Label = pick(locale, banner.cta2LabelBn, banner.cta2LabelEn);
    const cta2Href = resolveHref(banner.cta2Link, whatsappHref);
    return {
      id: banner.id,
      title: pick(locale, banner.titleBn, banner.title),
      subtitle: pick(locale, banner.subtitleBn, banner.subtitle),
      image: banner.image,
      mobileImage: banner.mobileImage ?? "",
      overlay: banner.overlay,
      textPosition: banner.textPosition,
      cta: {
        label: ctaLabel || common("applyNow"),
        href: resolveHref(banner.ctaLink, "/apply"),
      },
      cta2: {
        label: cta2Label || common("whatsapp"),
        href: cta2Href,
        whatsapp: cta2Href === whatsappHref,
      },
    };
  });

  const digits = (value: string) => (locale === "bn" ? toBanglaDigits(value) : value);
  const trust = [
    {
      icon: BadgeCheck,
      text: `${common("govtApproved")} · ${locale === "bn" ? "কোড" : "Code"} ${digits(settings.general.govtCode)}`,
    },
    {
      icon: CalendarDays,
      text: `${locale === "bn" ? "প্রতিষ্ঠাকাল" : "Since"} ${digits(String(settings.general.establishedYear))}`,
    },
    { icon: Stethoscope, text: home("trustPractical") },
    {
      icon: Phone,
      text: displayPhone(settings.contact.phone1),
      href: `tel:${settings.contact.phone1}`,
    },
  ];

  return (
    <>
      <HeroSlider
        slides={slides}
        settings={settings.hero}
        labels={{
          previous: common("previous"),
          next: common("next"),
          slide: slides.map((_, index) =>
            home("slide", {
              n: locale === "bn" ? toBanglaDigits(String(index + 1)) : index + 1,
            }),
          ),
        }}
      />

      {/* Trust bar: the institute facts that earn the click, always visible. */}
      <div className="border-b border-[color:var(--border)] bg-white">
        <ul className="container-content flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 text-sm font-medium text-[color:var(--brand)]">
          {trust.map((item) => (
            <li key={item.text} className="flex items-center gap-1.5">
              <item.icon
                className="size-4 text-[color:var(--accent-red)]"
                aria-hidden="true"
              />
              {item.href ? (
                <a href={item.href} className="font-latin hover:underline">
                  {item.text}
                </a>
              ) : (
                <span>{item.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

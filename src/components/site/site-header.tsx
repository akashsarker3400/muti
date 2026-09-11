import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { WhatsAppIcon } from "@/components/site/icons";
import { LanguageSwitch } from "@/components/site/language-switch";
import { Logo } from "@/components/site/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { primaryNav, secondaryNav } from "@/lib/nav";
import type { PublicCourse } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

/**
 * Sticky header (section 4): logo, nav, language switch, WhatsApp and Apply
 * Now. On mobile it collapses to a hamburger plus an always-visible WhatsApp
 * icon button.
 */
export async function SiteHeader({
  settings,
  locale,
  courses,
}: {
  settings: SiteSettings;
  locale: Locale;
  courses: PublicCourse[];
}) {
  const [nav, common] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
  ]);

  const shortName = settings.general.shortName || "MUTI";
  const instituteName = pick(locale, settings.general.nameBn, settings.general.nameEn);
  const whatsappHref = waLink(
    settings.contact.whatsapp,
    pick(
      locale,
      settings.whatsapp.defaultMessageBn,
      settings.whatsapp.defaultMessageEn,
    ),
  );

  const courseLinks = courses.map((course) => ({
    href: `/courses/${course.slug}`,
    label: pick(locale, course.nameBn, course.nameEn),
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-content flex h-16 items-center gap-3 lg:h-20">
        {/* No aria-label: the visible short name and institute name already
            give the link its accessible name. */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Logo src={settings.branding.logo} size={44} className="size-9 lg:size-11" />
          <span className="flex flex-col leading-tight">
            <span className="font-latin text-lg font-bold tracking-tight text-[color:var(--brand)] lg:text-xl">
              {shortName}
            </span>
            <span className="hidden max-w-[15rem] truncate text-[11px] text-[color:var(--muted-foreground)] sm:block lg:max-w-[22rem] lg:text-xs">
              {instituteName}
            </span>
          </span>
        </Link>

        <nav className="ms-auto hidden items-center lg:flex" aria-label={nav("menu")}>
          <ul className="flex items-center gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-9 items-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-[color:var(--foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)]"
                >
                  {nav(item.labelKey)}
                </Link>
              </li>
            ))}

            {/* CSS-only dropdown: works on hover and on keyboard focus. */}
            <li className="group relative">
              <button
                type="button"
                className="flex min-h-9 items-center gap-1 rounded-md px-2.5 text-sm font-medium text-[color:var(--foreground)] transition group-focus-within:bg-[color:var(--bg-soft)] group-hover:bg-[color:var(--bg-soft)] group-hover:text-[color:var(--brand)]"
                aria-haspopup="true"
              >
                {nav("more")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              <div className="invisible absolute end-0 top-full w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <ul className="rounded-xl border border-[color:var(--border)] bg-white p-1.5 shadow-[var(--shadow-card-hover)]">
                  {secondaryNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-10 items-center rounded-lg px-3 text-sm text-[color:var(--foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)]"
                      >
                        {nav(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-3">
          <LanguageSwitch className="hidden lg:flex" />

          {/* Always-visible WhatsApp affordance: icon on mobile, labelled on desktop. */}
          <Button
            asChild
            variant="whatsapp"
            size="icon-cta"
            className="lg:hidden"
            aria-label={common("whatsapp")}
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" />
            </a>
          </Button>
          <Button
            asChild
            variant="whatsapp"
            size="cta"
            className="hidden lg:inline-flex"
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-4" />
              {common("whatsappShort")}
            </a>
          </Button>

          <Button asChild variant="accent" size="cta" className="hidden sm:inline-flex">
            <Link href="/apply">{common("applyNow")}</Link>
          </Button>

          <MobileNav courseLinks={courseLinks} applyLabel={common("applyNow")} />
        </div>
      </div>
    </header>
  );
}

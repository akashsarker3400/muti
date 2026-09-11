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
import { aboutMenu, allNav, primaryNav, visibleNav, type NavItem } from "@/lib/nav";
import { getLeadershipMessages, type PublicCourse } from "@/lib/queries";
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

  // Published leadership pages join the About dropdown (addendum 3, §7).
  const leadership: NavItem[] = (await getLeadershipMessages()).map((message) => ({
    href: `/messages/${message.key}`,
    label: pick(locale, message.roleTitleBn, message.roleTitleEn),
  }));
  const about = aboutMenu(leadership);
  const flags = { health: settings.health.published };
  const bar = visibleNav(primaryNav, flags);
  const text = (item: NavItem) => item.label ?? nav(item.labelKey ?? "");

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
            <span className="hidden max-w-[15rem] truncate text-[11px] text-[color:var(--muted-foreground)] sm:block lg:hidden xl:block xl:max-w-[22rem] xl:text-xs">
              {instituteName}
            </span>
          </span>
        </Link>

        <nav className="ms-auto hidden items-center lg:flex" aria-label={nav("menu")}>
          <ul className="flex items-center gap-0.5">
            {bar.map((item) =>
              item.href === "/about" ? (
                // CSS-only dropdown: works on hover and on keyboard focus.
                <li key={item.href} className="group relative">
                  <Link
                    href="/about"
                    className="flex min-h-9 items-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap text-[color:var(--foreground)] transition group-focus-within:bg-[color:var(--bg-soft)] group-hover:bg-[color:var(--bg-soft)] group-hover:text-[color:var(--brand)] xl:px-2 xl:text-[13px] 2xl:px-2.5 2xl:text-sm"
                    aria-haspopup="true"
                  >
                    {nav("about")}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </Link>
                  <div className="invisible absolute start-0 top-full w-64 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="rounded-xl border border-[color:var(--border)] bg-white p-1.5 shadow-[var(--shadow-card-hover)]">
                      {about.map((entry) => (
                        <li key={entry.href}>
                          <Link
                            href={entry.href}
                            className="flex min-h-10 items-center rounded-lg px-3 text-sm text-[color:var(--foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)]"
                          >
                            {text(entry)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : (
                <li key={item.href} className={item.href === "/" ? "hidden" : ""}>
                  <Link
                    href={item.href}
                    className="flex min-h-9 items-center rounded-md px-1.5 text-xs font-medium whitespace-nowrap text-[color:var(--foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)] xl:px-2 xl:text-[13px] 2xl:px-2.5 2xl:text-sm"
                  >
                    {text(item)}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-3">
          <LanguageSwitch className="hidden lg:flex" />

          {/* Always-visible WhatsApp affordance: icon on mobile, labelled on desktop. */}
          <Button
            asChild
            variant="whatsapp"
            size="icon-cta"
            className="2xl:hidden"
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
            className="hidden 2xl:inline-flex"
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-4" />
              {common("whatsappShort")}
            </a>
          </Button>

          <Button asChild variant="accent" size="cta" className="hidden sm:inline-flex">
            <Link href="/apply">{common("applyNow")}</Link>
          </Button>

          <MobileNav
            courseLinks={courseLinks}
            applyLabel={common("applyNow")}
            items={visibleNav(allNav(leadership), flags).map((item) => ({
              href: item.href,
              label: text(item),
            }))}
          />
        </div>
      </div>
    </header>
  );
}

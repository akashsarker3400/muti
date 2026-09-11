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
import {
  aboutMenu,
  allNav,
  barNav,
  moreNav,
  visibleNav,
  type NavItem,
} from "@/lib/nav";
import {
  getFeaturedCourseBook,
  getLeadershipMessages,
  type PublicCourse,
} from "@/lib/queries";
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
  // The course book joins the Courses menu once it is published (addendum 5).
  const book = await getFeaturedCourseBook();
  if (book)
    courseLinks.push({ href: `/course-book/${book.slug}`, label: nav("courseBook") });

  // Published leadership pages join the About dropdown (addendum 3, §7).
  const leadership: NavItem[] = (await getLeadershipMessages()).map((message) => ({
    href: `/messages/${message.key}`,
    label: pick(locale, message.roleTitleBn, message.roleTitleEn),
  }));
  const about = aboutMenu(leadership);
  const flags = { health: settings.health.published };
  const bar = visibleNav(barNav, flags);
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
            <span className="hidden max-w-[15rem] truncate text-[11px] text-[color:var(--muted-foreground)] sm:block xl:hidden 2xl:block 2xl:max-w-[22rem] 2xl:text-xs">
              {instituteName}
            </span>
          </span>
        </Link>

        <nav className="ms-auto hidden items-center xl:flex" aria-label={nav("menu")}>
          <ul className="flex items-center gap-0.5">
            {bar.map((item) =>
              item.href === "/about" ? (
                // CSS-only dropdown: works on hover and on keyboard focus.
                <li key={item.href} className="group relative">
                  <Link
                    href="/about"
                    className="nav-text flex items-center gap-1 rounded-md px-1.5 whitespace-nowrap text-[color:var(--foreground)] transition group-focus-within:bg-[color:var(--bg-soft)] group-hover:bg-[color:var(--bg-soft)] group-hover:text-[color:var(--brand)] xl:px-2"
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
                            className="nav-text menu-item flex items-center px-3 text-[color:var(--foreground)] transition"
                          >
                            {text(entry)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : item.href === "/courses" && courseLinks.length > 0 ? (
                <li key={item.href} className="group relative">
                  <Link
                    href="/courses"
                    className="nav-text flex items-center gap-1 rounded-md px-1.5 whitespace-nowrap text-[color:var(--foreground)] transition group-focus-within:bg-[color:var(--bg-soft)] group-hover:bg-[color:var(--bg-soft)] group-hover:text-[color:var(--brand)] xl:px-2"
                    aria-haspopup="true"
                  >
                    {nav("courses")}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </Link>
                  <div className="invisible absolute start-0 top-full w-72 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="rounded-xl border border-[color:var(--border)] bg-white p-1.5 shadow-[var(--shadow-card-hover)]">
                      {courseLinks.map((entry) => (
                        <li key={entry.href}>
                          <Link
                            href={entry.href}
                            className="nav-text menu-item flex items-center px-3 text-[color:var(--foreground)] transition"
                          >
                            {entry.label}
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
                    className="nav-text flex items-center rounded-md px-1.5 whitespace-nowrap text-[color:var(--foreground)] transition hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--brand)] xl:px-2"
                  >
                    {text(item)}
                  </Link>
                </li>
              ),
            )}
            <li className="group relative">
              <button
                type="button"
                className="nav-text flex items-center gap-1 rounded-md px-1.5 whitespace-nowrap text-[color:var(--foreground)] transition group-focus-within:bg-[color:var(--bg-soft)] group-hover:bg-[color:var(--bg-soft)] group-hover:text-[color:var(--brand)] xl:px-2"
                aria-haspopup="true"
              >
                {nav("more")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              <div className="invisible absolute end-0 top-full w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <ul className="rounded-xl border border-[color:var(--border)] bg-white p-1.5 shadow-[var(--shadow-card-hover)]">
                  {moreNav.map((entry) => (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        className="nav-text menu-item flex items-center px-3 text-[color:var(--foreground)] transition"
                      >
                        {text(entry)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2 xl:ms-3">
          <LanguageSwitch className="hidden sm:flex" />

          {/* Always-visible WhatsApp affordance: icon on mobile, labelled on desktop. */}
          <Button
            asChild
            variant="whatsapp"
            size="icon-cta"
            aria-label={common("whatsapp")}
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" />
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

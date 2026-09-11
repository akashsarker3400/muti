import { Mail, MapPin, Phone, HeartPulse } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { FacebookIcon, WhatsAppIcon, YouTubeIcon } from "@/components/site/icons";
import { Logo } from "@/components/site/logo";
import { MapEmbed } from "@/components/site/map-embed";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick, toBanglaDigits } from "@/lib/format";
import { allNav, visibleNav } from "@/lib/nav";
import { getLeadershipMessages } from "@/lib/queries";
import { displayPhone, telHref } from "@/lib/phone";
import type { PublicCourse } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

export async function SiteFooter({
  settings,
  locale,
  courses,
}: {
  settings: SiteSettings;
  locale: Locale;
  courses: PublicCourse[];
}) {
  const [nav, footer, contact, common, leadership, health] = await Promise.all([
    getTranslations("nav"),
    getTranslations("footer"),
    getTranslations("contact"),
    getTranslations("common"),
    getLeadershipMessages(),
    getTranslations("health"),
  ]);
  const leadershipLinks = leadership.map((message) => ({
    href: `/messages/${message.key}`,
    label: pick(locale, message.roleTitleBn, message.roleTitleEn),
  }));

  const instituteName = pick(locale, settings.general.nameBn, settings.general.nameEn);
  const about = pick(locale, settings.footer.aboutBn, settings.footer.aboutEn);
  const address = pick(locale, settings.contact.addressBn, settings.contact.addressEn);
  const year = new Date().getFullYear();
  const yearLabel = locale === "bn" ? toBanglaDigits(year) : String(year);
  const govtCode =
    locale === "bn"
      ? toBanglaDigits(settings.general.govtCode)
      : settings.general.govtCode;

  const phones = [settings.contact.phone1, settings.contact.phone2].filter(
    (phone): phone is string => Boolean(phone?.trim()),
  );

  return (
    <footer className="mt-auto border-t border-[color:var(--border)] bg-[color:var(--brand-dark)] text-[color:#dfe4f2]">
      <div className="container-content grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-white p-1.5">
              <Logo src={settings.branding.logo} size={40} />
            </span>
            <span className="font-latin text-xl font-bold text-white">
              {settings.general.shortName || "MUTI"}
            </span>
          </div>
          <p className="text-sm font-medium text-white">{instituteName}</p>
          <p className="text-sm leading-relaxed text-[color:#b9c2dd]">{about}</p>
          {settings.health.published && (
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[color:#c3cbe4]">
              <HeartPulse
                className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]"
                aria-hidden="true"
              />
              <Link href="/health-service" className="hover:text-white hover:underline">
                {health("footerLine")}
              </Link>
            </p>
          )}
          <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {locale === "bn"
              ? `সরকারি প্রতিষ্ঠান কোড ${govtCode}`
              : `Govt. institute code ${govtCode}`}
          </p>
        </div>

        <nav aria-labelledby="footer-links">
          <h2
            id="footer-links"
            className="mb-4 text-sm font-semibold tracking-wider text-white uppercase"
          >
            {footer("quickLinks")}
          </h2>
          <ul className="space-y-2 text-sm">
            {visibleNav(allNav(leadershipLinks), { health: settings.health.published })
              .filter((item) => item.href !== "/")
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="nav-text inline-block text-[color:#b9c2dd] transition hover:text-white"
                  >
                    {item.label ?? nav(item.labelKey ?? "")}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-programs">
          <h2
            id="footer-programs"
            className="mb-4 text-sm font-semibold tracking-wider text-white uppercase"
          >
            {footer("programs")}
          </h2>
          {courses.length === 0 ? (
            <p className="text-sm text-[color:#b9c2dd]">{common("nothingHere")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="nav-text inline-block text-[color:#b9c2dd] transition hover:text-white"
                  >
                    {pick(locale, course.nameBn, course.nameEn)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div>
          <h2 className="mb-4 text-sm font-semibold tracking-wider text-white uppercase">
            {footer("contact")}
          </h2>
          <ul className="space-y-3 text-sm text-[color:#b9c2dd]">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{address}</span>
            </li>
            {phones.map((phone) => (
              <li key={phone} className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                <a
                  href={telHref(phone)}
                  className="font-latin transition hover:text-white"
                >
                  {displayPhone(phone)}
                </a>
              </li>
            ))}
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              <a
                href={`mailto:${settings.contact.email}`}
                className="font-latin break-all transition hover:text-white"
              >
                {settings.contact.email}
              </a>
            </li>
          </ul>

          <div className="mt-4 flex items-center gap-2">
            <a
              href={waLink(
                settings.contact.whatsapp,
                pick(
                  locale,
                  settings.whatsapp.defaultMessageBn,
                  settings.whatsapp.defaultMessageEn,
                ),
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={common("whatsapp")}
              className="grid size-10 place-items-center rounded-lg bg-white/10 transition hover:bg-[color:var(--whatsapp-ink)]"
            >
              <WhatsAppIcon className="size-5" />
            </a>
            {settings.contact.facebook && (
              <a
                href={settings.contact.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid size-10 place-items-center rounded-lg bg-white/10 transition hover:bg-[#1877F2]"
              >
                <FacebookIcon className="size-5" />
              </a>
            )}
            {settings.contact.youtube && (
              <a
                href={settings.contact.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="grid size-10 place-items-center rounded-lg bg-white/10 transition hover:bg-[#FF0000]"
              >
                <YouTubeIcon className="size-5" />
              </a>
            )}
          </div>

          <div className="mt-5">
            <MapEmbed
              settings={settings}
              address={address}
              title={contact("mapTitle")}
              className="h-40 w-full rounded-xl border border-white/15"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        {/* Extra end/bottom padding keeps the floating WhatsApp button from
            covering the copyright and credit line. */}
        <div className="container-content flex flex-col items-center justify-between gap-2 pt-5 pb-24 text-xs text-[color:#9aa5c6] sm:flex-row sm:pe-20 sm:pb-5">
          <p>
            © {yearLabel} {instituteName}. {footer("rights")}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="transition hover:text-white">
              {footer("privacy")}
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              {footer("terms")}
            </Link>

            <span aria-hidden="true" className="hidden text-white/20 sm:inline">
              |
            </span>

            <p>
              {footer("developedBy")}{" "}
              <a
                href="https://ans.digital"
                target="_blank"
                rel="noopener noreferrer"
                className="font-latin font-semibold text-[color:#c3cbe4] transition hover:text-white"
              >
                ANS DIGITAL
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

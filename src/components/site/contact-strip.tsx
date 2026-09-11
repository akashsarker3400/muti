import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { FacebookIcon, WhatsAppIcon } from "@/components/site/icons";
import { MapEmbed } from "@/components/site/map-embed";
import { Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { displayPhone, telHref } from "@/lib/phone";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

/** Address, phones, email, map and Facebook (section 5.1 item 13). */
export async function ContactStrip({
  settings,
  locale,
  soft = true,
}: {
  settings: SiteSettings;
  locale: Locale;
  soft?: boolean;
}) {
  const [home, contact, common] = await Promise.all([
    getTranslations("home"),
    getTranslations("contact"),
    getTranslations("common"),
  ]);

  const address = pick(locale, settings.contact.addressBn, settings.contact.addressEn);
  const officeHours = pick(
    locale,
    settings.contact.officeHoursBn,
    settings.contact.officeHoursEn,
  );
  const phones = [settings.contact.phone1, settings.contact.phone2].filter(
    (phone): phone is string => Boolean(phone?.trim()),
  );

  return (
    <Section soft={soft} id="contact">
      <SectionHeading title={home("contactTitle")} subtitle={home("contactSubtitle")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
          <dl className="space-y-5">
            <div>
              <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[color:var(--muted-foreground)] uppercase">
                <MapPin
                  className="size-4 shrink-0 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                {contact("addressTitle")}
              </dt>
              <dd className="mt-1 ps-6 leading-relaxed">{address}</dd>
            </div>

            <div>
              <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[color:var(--muted-foreground)] uppercase">
                <Phone
                  className="size-4 shrink-0 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                {contact("phoneTitle")}
              </dt>
              <dd className="mt-1 flex flex-col gap-0.5 ps-6">
                {phones.map((phone) => (
                  <a
                    key={phone}
                    href={telHref(phone)}
                    className="font-latin font-medium text-[color:var(--brand)] hover:underline"
                  >
                    {displayPhone(phone)}
                  </a>
                ))}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[color:var(--muted-foreground)] uppercase">
                <Mail
                  className="size-4 shrink-0 text-[color:var(--brand)]"
                  aria-hidden="true"
                />
                {contact("emailTitle")}
              </dt>
              <dd className="mt-1 ps-6">
                <a
                  href={`mailto:${settings.contact.email}`}
                  className="font-latin font-medium break-all text-[color:var(--brand)] hover:underline"
                >
                  {settings.contact.email}
                </a>
              </dd>
            </div>

            {officeHours && (
              <div>
                <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[color:var(--muted-foreground)] uppercase">
                  <Clock
                    className="size-4 shrink-0 text-[color:var(--brand)]"
                    aria-hidden="true"
                  />
                  {contact("hoursTitle")}
                </dt>
                <dd className="mt-1 ps-6">{officeHours}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="whatsapp" size="cta">
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
              >
                <WhatsAppIcon className="size-4" />
                {common("whatsapp")}
              </a>
            </Button>
            {phones[0] && (
              <Button asChild variant="brandOutline" size="cta">
                <a href={telHref(phones[0])}>
                  <Phone className="size-4" aria-hidden="true" />
                  {common("callNow")}
                </a>
              </Button>
            )}
            {settings.contact.facebook && (
              <Button asChild variant="outline" size="cta">
                <a
                  href={settings.contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FacebookIcon className="size-4 text-[#1877F2]" />
                  Facebook
                </a>
              </Button>
            )}
          </div>
        </div>

        <MapEmbed
          settings={settings}
          address={address}
          title={contact("mapTitle")}
          className="h-72 w-full rounded-[14px] border border-[color:var(--border)] lg:h-full"
        />
      </div>
    </Section>
  );
}

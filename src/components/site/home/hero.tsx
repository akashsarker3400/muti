import { getTranslations } from "next-intl/server";

import { HeroSlideshow } from "@/components/site/home/hero-slideshow";
import { WhatsAppIcon } from "@/components/site/icons";
import { SiteImage } from "@/components/site/media";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick, toBanglaDigits } from "@/lib/format";
import { heroSlides, type SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

export async function Hero({
  settings,
  locale,
}: {
  settings: SiteSettings;
  locale: Locale;
}) {
  const [common, home] = await Promise.all([
    getTranslations("common"),
    getTranslations("home"),
  ]);

  const title = pick(
    locale,
    settings.homepage.heroTitleBn,
    settings.homepage.heroTitleEn,
  );
  const subtitle = pick(
    locale,
    settings.homepage.heroSubBn,
    settings.homepage.heroSubEn,
  );
  const positioning = pick(
    locale,
    settings.general.positioningBn,
    settings.general.positioningEn,
  );
  const govtCode =
    locale === "bn"
      ? toBanglaDigits(settings.general.govtCode)
      : settings.general.govtCode;
  const slides = heroSlides(settings);
  const established =
    locale === "bn"
      ? toBanglaDigits(settings.general.establishedYear)
      : String(settings.general.establishedYear);

  return (
    <section className="border-b border-[color:var(--border)] bg-gradient-to-b from-[color:var(--bg-soft)] to-white">
      <div className="container-content grid items-center gap-8 py-10 md:py-16 lg:grid-cols-2 lg:gap-12">
        <div>
          {positioning && (
            <p className="mb-3 inline-flex items-center rounded-full border border-[color:var(--highlight)] bg-[color:var(--highlight)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--brand-dark)]">
              {positioning}
            </p>
          )}

          <h1 className="h1 text-balance">{title}</h1>

          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-[color:var(--muted-foreground)]">
            {subtitle}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild variant="accent" size="cta-lg">
              <Link href="/apply">{common("applyNow")}</Link>
            </Button>
            <Button asChild variant="whatsapp" size="cta-lg">
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
                <WhatsAppIcon className="size-5" />
                {common("whatsapp")}
              </a>
            </Button>
          </div>

          {/* Trust row (section 5.1) */}
          <p className="mt-5 text-sm font-medium text-[color:var(--muted-foreground)]">
            {locale === "bn"
              ? `সরকারি কোড ${govtCode} • প্রতিষ্ঠাকাল ${established} • BTEB অনুমোদিত`
              : `Govt. Code ${govtCode} • Since ${established} • BTEB affiliation`}
          </p>
        </div>

        {slides.length > 0 ? (
          <HeroSlideshow
            images={slides}
            alt={home("practicalTitle")}
            intervalSeconds={settings.homepage.heroSlideSeconds}
            className="aspect-[4/3] w-full lg:aspect-[5/4]"
            dotLabels={slides.map((_, index) =>
              home("slide", {
                n: locale === "bn" ? toBanglaDigits(String(index + 1)) : index + 1,
              }),
            )}
          />
        ) : (
          <SiteImage
            src=""
            alt={home("practicalTitle")}
            className="aspect-[4/3] w-full lg:aspect-[5/4]"
            placeholderLabel={
              locale === "bn"
                ? "প্র্যাকটিক্যাল ক্লাসের ছবি অ্যাডমিন প্যানেল থেকে যোগ করুন"
                : "Add a practical class photo from the admin panel"
            }
          />
        )}
      </div>
    </section>
  );
}

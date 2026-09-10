import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SiteImage } from "@/components/site/media";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localize, whyChooseMuti } from "@/lib/content";
import type { SiteSettings } from "@/lib/site-settings";

/** Section 5.1 item 6 — the real-patient practical block. */
export async function PracticalBlock({
  settings,
  locale,
}: {
  settings: SiteSettings;
  locale: Locale;
}) {
  const [home, common] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
  ]);

  // Three supporting points drawn from the "why choose" list.
  const points = [whyChooseMuti[1], whyChooseMuti[3], whyChooseMuti[5]];

  return (
    <Section>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <SiteImage
          src={settings.homepage.practicalImage}
          alt={home("practicalTitle")}
          className="aspect-[4/3] w-full"
          sizes="(max-width: 1024px) 100vw, 50vw"
          placeholderLabel={
            locale === "bn"
              ? "রিয়েল পেশেন্ট প্র্যাকটিক্যাল সেশনের ছবি যোগ করুন"
              : "Add a real-patient practical session photo"
          }
        />

        <div>
          <h2 className="h2">{home("practicalTitle")}</h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[color:var(--muted-foreground)]">
            {home("practicalBody")}
          </p>

          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point.icon} className="flex gap-2.5">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-[color:var(--success)]"
                  aria-hidden="true"
                />
                <span className="text-[0.95rem]">{localize(point, locale)}</span>
              </li>
            ))}
          </ul>

          <Button asChild variant="brandOutline" size="cta" className="mt-7">
            <Link href="/admission">{common("readMore")}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

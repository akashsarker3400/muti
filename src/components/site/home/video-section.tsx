import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { WhatsAppIcon } from "@/components/site/icons";
import { VideoJsonLd } from "@/components/site/json-ld";
import { Section } from "@/components/site/section";
import { VideoPlayer } from "@/components/site/video-player";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PublicVideo } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

/** Public shape of a video row: URLs only, no Media objects on the client. */
export function playable(video: PublicVideo) {
  return {
    id: video.id,
    title: video.title,
    source: video.source,
    embedUrl: video.embedUrl,
    fileUrl: video.file?.url ?? null,
    posterUrl: video.posterImage || video.poster?.url || null,
    autoplayMuted: video.autoplayMuted,
  };
}

/**
 * "MUTI in 1 minute" (homepage additions, 2): the institute video on the
 * left, a short pitch and the two calls to action on the right. Rendered only
 * when the office has marked a video for the homepage.
 */
export async function VideoSection({
  video,
  settings,
  locale,
}: {
  video: PublicVideo | null;
  settings: SiteSettings;
  locale: Locale;
}) {
  if (!video) return null;
  const [t, common] = await Promise.all([
    getTranslations("video"),
    getTranslations("common"),
  ]);

  return (
    <Section soft id="video">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <VideoPlayer
          video={playable(video)}
          labels={{ play: t("play"), unsupported: t("unsupported") }}
        />
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="h2 mt-2">{t("title")}</h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[color:var(--muted-foreground)]">
            {video.description || t("body")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="cta-lg">
              <Link href="/apply">
                {common("applyNow")}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="whatsapp" size="cta-lg">
              <a
                href={waLink(settings.contact.whatsapp, t("whatsappPrefill"))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-5" />
                {common("whatsapp")}
              </a>
            </Button>
          </div>
        </div>
      </div>
      <VideoJsonLd video={video} settings={settings} locale={locale} />
    </Section>
  );
}

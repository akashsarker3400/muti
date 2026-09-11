import { getTranslations } from "next-intl/server";

import { playable } from "@/components/site/home/video-section";
import { VideoJsonLd } from "@/components/site/json-ld";
import { VideoPlayer } from "@/components/site/video-player";
import type { Locale } from "@/i18n/routing";
import type { PublicVideo } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";

/** Grid of video cards with titles, used by the gallery, About and Health pages. */
export async function VideoGrid({
  videos,
  settings,
  locale,
  columns = 2,
}: {
  videos: PublicVideo[];
  settings: SiteSettings;
  locale: Locale;
  columns?: 1 | 2 | 3;
}) {
  if (videos.length === 0) return null;
  const t = await getTranslations("video");
  const labels = { play: t("play"), unsupported: t("unsupported") };
  const grid =
    columns === 3
      ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      : columns === 2
        ? "grid gap-6 md:grid-cols-2"
        : "grid gap-6";

  return (
    <div className={grid} data-testid="video-grid">
      {videos.map((video) => (
        <figure key={video.id} className="min-w-0">
          <VideoPlayer video={playable(video)} labels={labels} />
          <figcaption className="mt-3">
            <p className="font-semibold">{video.title}</p>
            {video.description && (
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                {video.description}
              </p>
            )}
          </figcaption>
          <VideoJsonLd video={video} settings={settings} locale={locale} />
        </figure>
      ))}
    </div>
  );
}

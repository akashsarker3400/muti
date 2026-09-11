"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

import { parseEmbedUrl } from "@/lib/video";
import { cn } from "cn";

export type PlayableVideo = {
  id: string;
  title: string;
  source: "EMBED" | "UPLOAD";
  embedUrl: string | null;
  fileUrl: string | null;
  posterUrl: string | null;
  autoplayMuted: boolean;
};

/**
 * One video, 16:9 and rounded (homepage additions, 2). Embeds load nothing
 * until the visitor presses play: the poster is a plain image, and only then
 * does the YouTube (privacy-enhanced) or Facebook iframe appear. Uploaded
 * MP4s use the native player with `preload="metadata"`; a silent ad can
 * autoplay muted and loop when the admin asks for it.
 */
export function VideoPlayer({
  video,
  labels,
  className,
  priority = false,
}: {
  video: PlayableVideo;
  labels: { play: string; unsupported: string };
  className?: string;
  priority?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const embed =
    video.source === "EMBED" && video.embedUrl ? parseEmbedUrl(video.embedUrl) : null;
  const poster = video.posterUrl ?? embed?.thumbnail ?? null;
  const frame = cn(
    "relative aspect-video w-full overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--brand)] shadow-[var(--shadow-card)]",
    className,
  );

  if (video.source === "UPLOAD" && video.fileUrl) {
    return (
      <div className={frame} data-testid="video-player" data-source="upload">
        <video
          className="size-full object-cover"
          controls={!video.autoplayMuted}
          preload="metadata"
          poster={poster ?? undefined}
          playsInline
          {...(video.autoplayMuted ? { autoPlay: true, muted: true, loop: true } : {})}
        >
          <source src={video.fileUrl} type="video/mp4" />
          <p className="p-6 text-center text-sm text-white">{labels.unsupported}</p>
        </video>
      </div>
    );
  }

  if (!embed) {
    return (
      <div className={frame} data-testid="video-player" data-source="none">
        <p className="grid h-full place-items-center p-6 text-center text-sm text-white/80">
          {labels.unsupported}
        </p>
      </div>
    );
  }

  if (playing) {
    return (
      <div className={frame} data-testid="video-player" data-source={embed.provider}>
        <iframe
          src={embed.src}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`${labels.play}: ${video.title}`}
      className={cn(
        frame,
        "group block text-start focus-visible:ring-4 focus-visible:ring-[color:var(--brand)]/40 focus-visible:outline-none",
      )}
      data-testid="video-player"
      data-source={embed.provider}
    >
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          priority={priority}
          unoptimized={poster.startsWith("http")}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-deep,#0f1d4a)]" />
      )}
      <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/15" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-white/95 text-[color:var(--brand)] shadow-lg transition group-hover:scale-105 sm:size-20">
          <Play className="ms-1 size-7 fill-current sm:size-8" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

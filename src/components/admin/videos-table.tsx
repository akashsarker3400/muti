"use client";

import Image from "next/image";
import { Film, PlaySquare } from "lucide-react";

import { deleteVideo, setVideoFlag } from "@/app/actions/admin-videos";
import { FlagToggle } from "@/components/admin/flag-toggle";
import { RowActions } from "@/components/admin/row-actions";
import { AdminBadge } from "@/components/admin/ui";

export type AdminVideo = {
  id: string;
  title: string;
  source: "EMBED" | "UPLOAD";
  provider: string;
  poster: string | null;
  duration: string;
  size: string;
  placement: "HOME" | "ABOUT" | "HEALTH";
  showOnHome: boolean;
  published: boolean;
};

const PLACEMENT = {
  HOME: "Homepage",
  ABOUT: "About",
  HEALTH: "Health service",
} as const;

export function VideosTable({ videos }: { videos: AdminVideo[] }) {
  return (
    <ul className="space-y-2" data-testid="videos-list">
      {videos.map((video) => (
        <li
          key={video.id}
          className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-3 shadow-[var(--shadow-card)] sm:p-4"
        >
          <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-md bg-[color:var(--brand)]">
            {video.poster ? (
              <Image
                src={video.poster}
                alt=""
                fill
                sizes="96px"
                unoptimized={video.poster.startsWith("http")}
                className="object-cover"
              />
            ) : (
              <Film
                className="absolute inset-0 m-auto size-6 text-white/70"
                aria-hidden="true"
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{video.title}</span>
              <AdminBadge tone="brand">
                {video.source === "UPLOAD" ? (
                  <Film className="me-1 size-3" aria-hidden="true" />
                ) : (
                  <PlaySquare className="me-1 size-3" aria-hidden="true" />
                )}
                {video.provider}
              </AdminBadge>
              <AdminBadge>{PLACEMENT[video.placement]}</AdminBadge>
              {!video.published && <AdminBadge tone="warning">Unpublished</AdminBadge>}
            </div>
            <p className="mt-0.5 font-latin text-xs text-[color:var(--muted-foreground)]">
              {[video.duration, video.size].filter(Boolean).join(" · ") || "Embedded"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <FlagToggle
              value={video.showOnHome}
              label="homepage"
              onToggle={(next) => setVideoFlag(video.id, "showOnHome", next)}
            />
            Homepage
          </label>
          <label className="flex items-center gap-2 text-xs">
            <FlagToggle
              value={video.published}
              label="published"
              onToggle={(next) => setVideoFlag(video.id, "published", next)}
            />
            Published
          </label>
          <RowActions
            editHref={`/admin/videos/${video.id}`}
            onDelete={() => deleteVideo(video.id)}
            label={video.title}
          />
        </li>
      ))}
    </ul>
  );
}

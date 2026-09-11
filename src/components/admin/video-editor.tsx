"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { saveVideo } from "@/app/actions/admin-videos";
import { Panel } from "@/components/admin/ui";
import { UploadField } from "@/components/admin/upload-field";
import { VideoPlayer } from "@/components/site/video-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  clockDuration,
  parseEmbedUrl,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_SECONDS,
} from "@/lib/video";
import { cn } from "cn";

export type VideoEditorValues = {
  id: string | null;
  title: string;
  description: string;
  source: "EMBED" | "UPLOAD";
  embedUrl: string;
  fileId: string;
  fileUrl: string;
  fileDuration: number | null;
  fileSize: number | null;
  posterId: string;
  posterUrl: string;
  posterImage: string;
  autoplayMuted: boolean;
  showOnHome: boolean;
  placement: "HOME" | "ABOUT" | "HEALTH";
  sortOrder: number;
  published: boolean;
};

type UploadResult = {
  fileId: string;
  url: string;
  posterId: string;
  posterUrl: string;
  duration: number;
  size: number;
  error?: string;
};

/** Reads the duration of a local file through a detached <video> element. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/** Uploads with progress, which fetch() cannot report. */
function uploadWithProgress(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload/video");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as UploadResult;
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

const PLACEMENTS = [
  { value: "HOME", label: "Homepage" },
  { value: "ABOUT", label: "About page" },
  { value: "HEALTH", label: "Health service page" },
] as const;

/**
 * Video editor (homepage additions, 2): pick an embed link or upload an MP4
 * with a progress bar. Size and duration are checked in the browser before a
 * byte is sent; the server checks again with ffprobe.
 */
export function VideoEditor({ initial }: { initial: VideoEditorValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof VideoEditorValues>(
    key: K,
    value: VideoEditorValues[K],
  ) => {
    setV((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function pickFile(file: File) {
    if (!(file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4"))) {
      toast.error("Only MP4 (H.264/AAC) files are accepted.");
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      toast.error(
        `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 60 MB.`,
      );
      return;
    }
    setChecking(true);
    const duration = await readDuration(file);
    setChecking(false);
    if (duration !== null && duration > VIDEO_MAX_SECONDS + 0.5) {
      toast.error(
        `The video is ${Math.round(duration)} seconds long; the limit is 90 seconds.`,
      );
      return;
    }
    setProgress(0);
    try {
      const result = await uploadWithProgress(file, setProgress);
      setV((current) => ({
        ...current,
        source: "UPLOAD",
        fileId: result.fileId,
        fileUrl: result.url,
        fileDuration: result.duration,
        fileSize: result.size,
        posterId: result.posterId,
        posterUrl: result.posterUrl,
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.fileId;
        return next;
      });
      toast.success(
        `Uploaded (${clockDuration(result.duration)}). A poster frame was generated.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveVideo(v.id, {
        title: v.title,
        description: v.description,
        source: v.source,
        embedUrl: v.embedUrl,
        fileId: v.fileId,
        posterId: v.posterId,
        posterImage: v.posterImage,
        autoplayMuted: v.autoplayMuted,
        showOnHome: v.showOnHome,
        placement: v.placement,
        sortOrder: v.sortOrder,
        published: v.published,
      });
      if (result.ok) {
        toast.success("Saved.");
        router.push("/admin/videos");
        router.refresh();
        return;
      }
      if (result.errors) {
        setErrors(result.errors);
        toast.error(Object.values(result.errors)[0] ?? "Some fields need attention.");
      } else toast.error(result.error ?? "Could not save.");
    });
  }

  const embed = v.source === "EMBED" && v.embedUrl ? parseEmbedUrl(v.embedUrl) : null;
  const previewReady = v.source === "EMBED" ? Boolean(embed) : Boolean(v.fileUrl);

  return (
    <form onSubmit={submit} className="space-y-5">
      <Panel className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="video-title">
              Title <span className="text-[color:var(--accent-red)]">*</span>
            </Label>
            <Input
              id="video-title"
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              aria-invalid={errors.title ? true : undefined}
              className="h-11"
            />
            {errors.title && (
              <p className="text-xs text-[color:var(--error)]">{errors.title}</p>
            )}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="video-description">Short text (optional)</Label>
            <Textarea
              id="video-description"
              rows={3}
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Shown beside the homepage video and under it in the gallery. Also used as
              the description for search engines.
            </p>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Source</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "EMBED",
                  title: "YouTube or Facebook link (recommended)",
                  body: "Fast and free of bandwidth. Loads only when a visitor presses play.",
                },
                {
                  value: "UPLOAD",
                  title: "Upload an MP4",
                  body: "H.264/AAC, up to 90 seconds and 60 MB. A poster frame is generated for you.",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3",
                  v.source === option.value
                    ? "border-[color:var(--brand)] bg-[#eef2fa]"
                    : "border-[color:var(--border)] hover:bg-[color:var(--bg-soft)]",
                )}
              >
                <input
                  type="radio"
                  name="source"
                  value={option.value}
                  checked={v.source === option.value}
                  onChange={() => set("source", option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="block text-xs text-[color:var(--muted-foreground)]">
                    {option.body}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {v.source === "EMBED" ? (
          <div className="space-y-1.5">
            <Label htmlFor="video-embed">Video link</Label>
            <Input
              id="video-embed"
              dir="ltr"
              placeholder="https://www.youtube.com/watch?v=… or https://www.facebook.com/…/videos/…"
              value={v.embedUrl}
              onChange={(e) => set("embedUrl", e.target.value)}
              aria-invalid={errors.embedUrl ? true : undefined}
              className="h-11 font-latin"
            />
            {errors.embedUrl ? (
              <p className="text-xs text-[color:var(--error)]">{errors.embedUrl}</p>
            ) : v.embedUrl && !embed ? (
              <p className="text-xs text-[color:var(--error)]">
                Only YouTube and Facebook video links are supported.
              </p>
            ) : (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                YouTube plays through the privacy-enhanced youtube-nocookie.com domain.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>MP4 file</Label>
            {v.fileUrl && (
              <p className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-2 font-latin text-xs text-[color:var(--muted-foreground)]">
                {v.fileUrl}
                {v.fileDuration ? ` · ${clockDuration(v.fileDuration)}` : ""}
                {v.fileSize ? ` · ${(v.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,.mp4"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void pickFile(file);
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="cta"
                disabled={progress !== null || checking}
                onClick={() => inputRef.current?.click()}
              >
                {progress !== null || checking ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                {v.fileUrl ? "Replace video" : "Choose MP4"}
              </Button>
              <span className="text-xs text-[color:var(--muted-foreground)]">
                Max 90 seconds and 60 MB. Checked before the upload starts.
              </span>
            </div>
            {progress !== null && (
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--bg-soft)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div
                  className="h-full bg-[color:var(--brand)] transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
            {progress !== null && progress >= 1 && (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Uploaded. Checking the file and making the poster frame…
              </p>
            )}
            {errors.fileId && (
              <p className="text-xs text-[color:var(--error)]">{errors.fileId}</p>
            )}
            <label className="flex items-center gap-2 pt-1 text-sm">
              <input
                type="checkbox"
                checked={v.autoplayMuted}
                onChange={(e) => set("autoplayMuted", e.target.checked)}
              />
              Autoplay muted and loop (for a silent ad; no controls)
            </label>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="video-poster">Poster image override (optional)</Label>
          <UploadField
            id="video-poster"
            value={v.posterImage}
            onChange={(url) => set("posterImage", url)}
            kind="image"
          />
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {v.source === "UPLOAD"
              ? "Replaces the generated poster frame."
              : "Replaces the YouTube thumbnail. Facebook videos have no thumbnail, so upload one here."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="video-placement">Placement</Label>
            <select
              id="video-placement"
              value={v.placement}
              onChange={(e) =>
                set("placement", e.target.value as VideoEditorValues["placement"])
              }
              className="h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm"
            >
              {PLACEMENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-order">Order (lowest first)</Label>
            <Input
              id="video-order"
              type="number"
              value={v.sortOrder}
              onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              className="h-11 font-latin"
            />
          </div>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.showOnHome}
                onChange={(e) => set("showOnHome", e.target.checked)}
              />
              Show in “MUTI in 1 minute” on the homepage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.published}
                onChange={(e) => set("published", e.target.checked)}
              />
              Published
            </label>
          </div>
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-3 text-base font-semibold">Preview</h2>
        {previewReady ? (
          <div className="max-w-2xl">
            <VideoPlayer
              key={`${v.source}-${v.embedUrl}-${v.fileUrl}-${v.posterImage}-${v.autoplayMuted}`}
              video={{
                id: v.id ?? "preview",
                title: v.title || "Preview",
                source: v.source,
                embedUrl: v.embedUrl || null,
                fileUrl: v.fileUrl || null,
                posterUrl: v.posterImage || v.posterUrl || null,
                autoplayMuted: v.autoplayMuted,
              }}
              labels={{
                play: "Play",
                unsupported: "This browser cannot play the video.",
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Paste a link or upload a file to see the preview.
          </p>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant="brand"
          size="cta"
          disabled={pending || progress !== null}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save
        </Button>
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/videos">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Uploads one file to /api/admin/upload and stores the returned path.
 * The value is always a site-relative URL such as
 * `/uploads/2026-09/ab12….webp`, so it keeps working across redeploys.
 */
export function UploadField({
  value,
  id,
  onChange,
  accept = "image/*",
  kind = "image",
}: {
  /** Ties the field's <label> to the path input below. */
  id?: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  kind?: "image" | "file";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        toast.error(data.error ?? "Upload failed.");
        return;
      }

      onChange(data.url);
      toast.success("Uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-2">
          {kind === "image" ? (
            <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-white">
              <Image src={value} alt="" fill sizes="64px" className="object-contain" />
            </span>
          ) : (
            <FileText
              className="size-8 shrink-0 text-[color:var(--brand)]"
              aria-hidden="true"
            />
          )}

          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate font-latin text-xs text-[color:var(--muted-foreground)] hover:underline"
          >
            {value}
          </a>

          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            aria-label="Remove"
            onClick={() => onChange("")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="cta"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {value ? "Change" : "Upload"}
        </Button>

        {/* Manual path entry, for files already on the volume. */}
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/uploads/…"
          aria-label="File path"
          dir="ltr"
          className="h-11 w-full min-w-0 font-latin text-xs sm:max-w-xs"
        />
      </div>

      <p className="text-xs break-words text-[color:var(--muted-foreground)]">
        Up to 10 MB. Images are converted to webp automatically (max 1600px).
      </p>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Passport-size photo for the admission form (optional). Uploads straight to
 * the public photo endpoint, which re-encodes and renames the file, and keeps
 * only the returned path in the form state.
 */
export function PhotoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("form");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload/photo", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        toast.error(data.error ?? t("photoFailed"));
        return;
      }
      onChange(data.url);
    } catch {
      toast.error(t("photoFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-start gap-4">
      <span className="grid aspect-[4/5] w-[88px] shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)]">
        {value ? (
          <Image
            src={value}
            alt=""
            width={88}
            height={110}
            className="size-full object-cover object-top"
          />
        ) : (
          <UserRound
            className="size-8 text-[color:var(--muted-foreground)]"
            aria-hidden="true"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
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
            {value ? t("photoChange") : t("photoChoose")}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="cta"
              onClick={() => onChange("")}
              disabled={busy}
            >
              <Trash2 className="size-4 text-[color:var(--error)]" aria-hidden="true" />
              {t("photoRemove")}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
          {t("photoHint")}
        </p>
      </div>
    </div>
  );
}

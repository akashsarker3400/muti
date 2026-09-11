"use client";

import { useState } from "react";
import { Download, ExternalLink, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "View" opens a PDF (or image) inside the page in a full-height dialog,
 * "Download" saves it. The uploads route serves files inline, so the same
 * URL works in the iframe, in a new tab, and — with `?download=1` — as a
 * download. Phones that cannot render PDFs in a frame get the new-tab link.
 */
export function FileViewer({
  url,
  title,
  compact = false,
}: {
  url: string;
  title: string;
  compact?: boolean;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const isPdf = /\.pdf(\?|$)/i.test(url);
  const downloadUrl = `${url}${url.includes("?") ? "&" : "?"}download=1`;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {isPdf && (
          <Button
            type="button"
            variant="brand"
            size="cta"
            onClick={() => setOpen(true)}
            aria-label={`${t("view")}: ${title}`}
          >
            <Eye className="size-4" aria-hidden="true" />
            <span className={compact ? "hidden sm:inline" : ""}>{t("view")}</span>
          </Button>
        )}
        <Button asChild variant="brandOutline" size="cta">
          <a href={downloadUrl} download aria-label={`${t("download")}: ${title}`}>
            <Download className="size-4" aria-hidden="true" />
            <span className={compact ? "hidden sm:inline" : ""}>{t("download")}</span>
          </a>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-3 p-4 sm:max-w-5xl sm:p-5">
          <DialogHeader className="pe-8">
            <DialogTitle className="truncate">{title}</DialogTitle>
            <DialogDescription className="flex flex-wrap gap-3 text-xs">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[color:var(--brand)] hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t("openInNewTab")}
              </a>
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-1 font-medium text-[color:var(--brand)] hover:underline"
              >
                <Download className="size-3.5" aria-hidden="true" />
                {t("download")}
              </a>
            </DialogDescription>
          </DialogHeader>
          {open && (
            <iframe
              src={`${url}#toolbar=1&view=FitH`}
              title={title}
              className="min-h-0 w-full flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

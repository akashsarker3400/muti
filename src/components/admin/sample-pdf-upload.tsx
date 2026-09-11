"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { removeSamplePdf } from "@/app/actions/admin-book";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

/**
 * Upload box for the free sample chapter PDF (addendum 5, A7). The server
 * stamps the header and footer and stores it as a protected file; the admin
 * can check the stamped result through the preview link, which uses the
 * signed-in session rather than a visitor token.
 */
export function SamplePdfUpload({
  bookId,
  current,
}: {
  bookId: string;
  current: { size: number; uploadedAt: string } | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("bookId", bookId);
      const response = await fetch("/api/admin/upload/sample-pdf", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Upload failed.");
        return;
      }
      toast.success("Sample chapter uploaded and stamped.");
      router.refresh();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Panel>
      <h2 className="text-base font-semibold">Free sample chapter (PDF)</h2>
      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
        Upload chapter 01 as its own PDF. A MUTI header and a “Sample chapter, not for
        resale” footer are added to every page. The file is stored as protected: it is
        never served from /uploads, only through the 24-hour link a visitor gets after
        filling in the form.
      </p>

      {current ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-3">
          <ShieldCheck
            className="size-6 text-[color:var(--success)]"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Sample PDF in place</p>
            <p className="font-latin text-xs text-[color:var(--muted-foreground)]">
              {(current.size / 1024 / 1024).toFixed(2)} MB · uploaded{" "}
              {current.uploadedAt}
            </p>
          </div>
          <Button asChild variant="outline" size="cta">
            <a href="/api/v1/book/sample?preview=1" target="_blank" rel="noopener">
              <FileText className="size-4" aria-hidden="true" />
              Preview
            </a>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            aria-label="Remove sample PDF"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (
                  !window.confirm(
                    "Remove the sample PDF? The book will be unpublished.",
                  )
                )
                  return;
                const result = await removeSamplePdf(bookId);
                if (result.ok) {
                  toast.success("Removed.");
                  router.refresh();
                } else toast.error(result.error ?? "Could not remove the file.");
              })
            }
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-[color:var(--accent-red)]/50 bg-red-50 p-3 text-sm text-[color:var(--accent-red)]">
          TODO: no sample PDF yet. The book cannot be published until it is uploaded.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
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
        className="mt-3"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="size-4" aria-hidden="true" />
        )}
        {current ? "Replace PDF" : "Upload PDF"}
      </Button>
    </Panel>
  );
}

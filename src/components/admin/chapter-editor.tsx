"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { reviewChapter, saveChapterContent } from "@/app/actions/admin-book-content";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

/** Writes one chapter, and records the doctor who approved it. */
export function ChapterEditor({
  chapterId,
  bodyHtml,
  reviewed,
  reviewedBy,
  canApprove,
}: {
  chapterId: string;
  bodyHtml: string;
  reviewed: boolean;
  reviewedBy: string | null;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [html, setHtml] = useState(bodyHtml);

  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {reviewed ? (
            <>
              <AdminBadge tone="success">Reviewed</AdminBadge>
              {reviewedBy && (
                <span className="ms-2 text-[color:var(--muted-foreground)]">
                  by {reviewedBy}
                </span>
              )}
            </>
          ) : (
            <>
              <AdminBadge tone="warning">Not reviewed</AdminBadge>
              <span className="ms-2 text-[color:var(--muted-foreground)]">
                students cannot see this yet
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="brand"
            size="cta"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await saveChapterContent({ chapterId, bodyHtml: html });
                if (!result.ok) {
                  toast.error(result.error ?? "Could not save.");
                  return;
                }
                toast.success("Saved. It needs reviewing again before students see it.");
                router.refresh();
              })
            }
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Save chapter
          </Button>

          {canApprove && !reviewed && (
            <Button
              type="button"
              variant="outline"
              size="cta"
              disabled={pending || !html.trim()}
              onClick={() => {
                const reviewer = window.prompt(
                  "Which doctor checked this chapter? Name and degree.",
                );
                if (!reviewer?.trim()) return;
                startTransition(async () => {
                  const result = await reviewChapter({ chapterId, reviewer });
                  if (!result.ok) {
                    toast.error(result.error ?? "Could not record the review.");
                    return;
                  }
                  toast.success("Reviewed. Students can read it now.");
                  router.refresh();
                });
              }}
            >
              <BadgeCheck className="size-4" aria-hidden="true" />
              Record the review
            </Button>
          )}
        </div>
      </Panel>

      <Panel>
        <RichTextEditor value={html} onChange={setHtml} />
      </Panel>
    </div>
  );
}

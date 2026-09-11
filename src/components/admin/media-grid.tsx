"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteMediaFile } from "@/app/actions/admin-media";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { MediaFile } from "@/lib/admin/media";
import { formatDate } from "@/lib/format";
import { cn } from "cn";

/** Media library grid with a "used / unused" filter (section 7.13). */
export function MediaGrid({ files }: { files: MediaFile[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unused">("all");
  const [pending, startTransition] = useTransition();

  const visible = filter === "unused" ? files.filter((file) => !file.used) : files;
  const unusedCount = files.filter((file) => !file.used).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          সব ({files.length})
        </FilterButton>
        <FilterButton active={filter === "unused"} onClick={() => setFilter("unused")}>
          অব্যবহৃত ({unusedCount})
        </FilterButton>
      </div>

      {visible.length === 0 ? (
        <Panel>
          <p className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">
            কোনো ফাইল পাওয়া যায়নি।
          </p>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((file) => (
            <li
              key={file.url}
              data-media-url={file.url}
              className="overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block aspect-[4/3] bg-[color:var(--bg-soft)]"
              >
                {file.isImage ? (
                  <Image
                    src={file.url}
                    alt={file.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-contain"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-[color:var(--brand)]">
                    <FileText className="size-10" aria-hidden="true" />
                  </span>
                )}
              </a>

              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  {file.used ? (
                    <AdminBadge tone="success">ব্যবহৃত</AdminBadge>
                  ) : (
                    <AdminBadge tone="warning">অব্যবহৃত</AdminBadge>
                  )}
                  <span className="nums font-latin text-xs text-[color:var(--muted-foreground)]">
                    {formatSize(file.size)}
                  </span>
                </div>

                <p className="truncate font-latin text-xs text-[color:var(--muted-foreground)]">
                  {file.url}
                </p>
                <p className="text-xs text-[color:var(--muted-foreground)]">
                  {formatDate(file.modified, "bn")}
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(file.url);
                        toast.success("লিংক কপি হয়েছে।");
                      } catch {
                        toast.error("কপি করা যায়নি।");
                      }
                    }}
                  >
                    <Copy className="size-3.5" aria-hidden="true" />
                    লিংক
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="ফাইল মুছুন"
                    className="ms-auto"
                    disabled={pending || file.used}
                    title={
                      file.used
                        ? "এই ফাইলটি ব্যবহৃত হচ্ছে, তাই মোছা যাবে না।"
                        : undefined
                    }
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteMediaFile(file.url);
                        if (result.ok) {
                          toast.success("ফাইল মুছে ফেলা হয়েছে।");
                          router.refresh();
                        } else {
                          toast.error(result.error ?? "মুছে ফেলা যায়নি।");
                        }
                      })
                    }
                  >
                    <Trash2
                      className="size-4 text-[color:var(--error)]"
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
          : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
      )}
    >
      {children}
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

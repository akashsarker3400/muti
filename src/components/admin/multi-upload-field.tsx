"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * An ordered list of uploaded images — used for the homepage hero slides.
 * The order here is the order on the site, so each row can be moved up or
 * down. Values are site-relative `/uploads/…` paths like `UploadField`.
 */
export function MultiUploadField({
  id,
  value,
  onChange,
  max = 8,
}: {
  /** Ties the field's <label> to the "add by path" input. */
  id?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [path, setPath] = useState("");

  const full = value.length >= max;

  async function upload(files: FileList) {
    setBusy(true);
    const added: string[] = [];
    try {
      // Sequential so the chosen order is the order that lands in the list.
      for (const file of Array.from(files).slice(0, max - value.length)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          toast.error(data.error ?? `আপলোড করা যায়নি: ${file.name}`);
          continue;
        }
        added.push(data.url);
      }
      if (added.length > 0) {
        onChange([...value, ...added]);
        toast.success(`${added.length}টি ছবি যোগ হয়েছে।`);
      }
    } catch {
      toast.error("আপলোড করা যায়নি।");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function addPath() {
    const trimmed = path.trim();
    if (!trimmed || full) return;
    onChange([...value, trimmed]);
    setPath("");
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ol className="space-y-2" data-testid={id ? `${id}-list` : undefined}>
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-2"
            >
              <span className="w-5 shrink-0 text-center font-latin text-xs font-semibold text-[color:var(--muted-foreground)]">
                {index + 1}
              </span>
              <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-white">
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-latin text-xs text-[color:var(--muted-foreground)] hover:underline"
              >
                {url}
              </a>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="উপরে নিন"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="নিচে নিন"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="সরান"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="cta"
          disabled={busy || full}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          ছবি যোগ করুন
        </Button>

        {/* Manual path entry, for files already on the volume. */}
        <Input
          id={id}
          value={path}
          onChange={(event) => setPath(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addPath();
            }
          }}
          placeholder="/uploads/… (Enter চাপুন)"
          aria-label="ছবির পাথ"
          dir="ltr"
          disabled={full}
          className="h-11 w-full min-w-0 font-latin text-xs sm:max-w-xs"
        />
      </div>

      <p className="text-xs break-words text-[color:var(--muted-foreground)]">
        সর্বোচ্চ {max}টি ছবি, প্রতিটি ১০ MB পর্যন্ত। একসাথে একাধিক ছবি বাছাই করা যায়;
        ক্রম বদলাতে তীর চিহ্ন ব্যবহার করুন।
      </p>
    </div>
  );
}

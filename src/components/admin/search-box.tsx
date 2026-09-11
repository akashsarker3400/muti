"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Writes the query into `?q=` so the list page can filter server-side. */
export function SearchBox({ placeholder = "খুঁজুন…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function apply(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    // A new search always starts from the first page.
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(value);
      }}
      className="flex w-full items-center gap-2 sm:max-w-xs"
      role="search"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-[color:var(--muted-foreground)]"
          aria-hidden="true"
        />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 ps-9"
        />
        {value && (
          <button
            type="button"
            aria-label="মুছুন"
            onClick={() => {
              setValue("");
              apply("");
            }}
            className="absolute inset-y-0 end-2 my-auto grid size-7 place-items-center rounded-md hover:bg-[color:var(--bg-soft)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <Button type="submit" variant="outline" size="cta">
        খুঁজুন
      </Button>
    </form>
  );
}

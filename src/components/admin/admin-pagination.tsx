import Link from "next/link";

import { cn } from "cn";

/** Server-rendered pager shared by every admin list. */
export function AdminPagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  function href(target: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  // Show a window around the current page so long lists stay usable.
  const numbers = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const visible = [...numbers]
    .filter((number) => number >= 1 && number <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="পৃষ্ঠা">
      {visible.map((number, index) => (
        <span key={number} className="flex items-center gap-1.5">
          {index > 0 && visible[index - 1]! < number - 1 && (
            <span className="px-1 text-sm text-[color:var(--muted-foreground)]">…</span>
          )}
          <Link
            href={href(number)}
            aria-current={number === page ? "page" : undefined}
            className={cn(
              "nums grid min-h-9 min-w-9 place-items-center rounded-lg border px-2.5 font-latin text-sm",
              number === page
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
            )}
          >
            {number}
          </Link>
        </span>
      ))}
    </nav>
  );
}

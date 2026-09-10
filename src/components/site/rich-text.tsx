import { cn } from "cn";

import { sanitizeRichText } from "@/lib/sanitize";

/** Renders sanitised admin HTML with the site's prose styles. */
export function RichText({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const clean = sanitizeRichText(html);
  if (!clean) return null;

  return (
    <div
      className={cn("prose-muti", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

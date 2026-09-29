import { AlertTriangle } from "lucide-react";

import { siteUrl } from "@/lib/env";

/**
 * A QR printed with the wrong address is worse than no QR: nobody notices
 * until a graduate's employer scans it. `NEXT_PUBLIC_SITE_URL` is what these
 * documents are built from, so say so loudly before anything is printed.
 */
export function SiteUrlWarning() {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(siteUrl);
  if (!local) return null;

  return (
    <p className="no-print mb-4 flex gap-2 rounded-lg border border-[color:var(--accent-red)] bg-red-50 p-3 text-sm text-[color:var(--accent-red)]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        The QR code on this document points at{" "}
        <code className="font-latin">{siteUrl}</code>, which nobody outside this machine
        can open. Set <code className="font-latin">NEXT_PUBLIC_SITE_URL</code> to the
        public address of the site before printing anything a student keeps.
      </span>
    </p>
  );
}

import { FileCheck2, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { getContent } from "@/lib/content-items";
import { pick } from "@/lib/format";
import { getSiteSettings } from "@/lib/site-settings";

/** Required documents, identical for every course (admin-editable). */
export async function DocumentsList({ locale }: { locale: Locale }) {
  const [documents, settings, t] = await Promise.all([
    getContent("DOCUMENT", locale),
    getSiteSettings(),
    getTranslations("course"),
  ]);

  if (documents.length === 0) return null;

  const note = pick(
    locale,
    settings.content.documentsNoteBn,
    settings.content.documentsNoteEn,
  );

  return (
    <div>
      <h2 className="h3">{t("documentsTitle")}</h2>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border)] bg-white p-3 text-sm"
          >
            <FileCheck2
              className="mt-0.5 size-4 shrink-0 text-[color:var(--brand)]"
              aria-hidden="true"
            />
            <span>{doc.body}</span>
          </li>
        ))}
      </ul>

      {note && (
        <p className="mt-3 flex items-start gap-2 text-sm text-[color:var(--muted-foreground)]">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}

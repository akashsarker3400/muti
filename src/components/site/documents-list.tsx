import { FileCheck2, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { documentsNote, localize, requiredDocuments } from "@/lib/content";

/** Required documents, identical for every course (section 3). */
export async function DocumentsList({ locale }: { locale: Locale }) {
  const t = await getTranslations("course");

  return (
    <div>
      <h2 className="h3">{t("documentsTitle")}</h2>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {requiredDocuments.map((doc) => (
          <li
            key={doc.en}
            className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border)] bg-white p-3 text-sm"
          >
            <FileCheck2
              className="mt-0.5 size-4 shrink-0 text-[color:var(--brand)]"
              aria-hidden="true"
            />
            <span>{localize(doc, locale)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-2 text-sm text-[color:var(--muted-foreground)]">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{localize(documentsNote, locale)}</span>
      </p>
    </div>
  );
}

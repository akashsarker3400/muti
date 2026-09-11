import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { FileViewer } from "@/components/site/file-viewer";
import type { Locale } from "@/i18n/routing";
import { getDownloads } from "@/lib/queries";
import { pageAlternates } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "downloads" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/downloads"),
  };
}

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [downloads, t] = await Promise.all([
    getDownloads(),
    getTranslations("downloads"),
  ]);

  // Group by the optional category so long lists stay scannable.
  const groups = new Map<string, typeof downloads>();
  for (const file of downloads) {
    const key = file.category?.trim() || "";
    const group = groups.get(key);
    if (group) group.push(file);
    else groups.set(key, [file]);
  }

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {downloads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
            {t("empty")}
          </p>
        ) : (
          <div className="space-y-8">
            {[...groups.entries()].map(([category, files]) => (
              <div key={category || "general"}>
                {category && (
                  <h2 className="mb-3 text-base font-semibold">{category}</h2>
                )}
                <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]">
                  {files.map((file) => (
                    <li key={file.id} className="flex items-center gap-3 p-4 sm:px-5">
                      <FileText
                        className="size-5 shrink-0 text-[color:var(--brand)]"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {file.title}
                      </span>
                      <FileViewer url={file.fileUrl} title={file.title} compact />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

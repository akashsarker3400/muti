import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import { getNoticeBySlug } from "@/lib/queries";
import { pageAlternates } from "@/i18n/routing";

/** `attachments` is free-form JSON in the schema; validate before rendering. */
type Attachment = { name: string; url: string };

function readAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { name, url } = item as Record<string, unknown>;
    if (typeof url !== "string" || !url) return [];
    return [{ name: typeof name === "string" && name ? name : url, url }];
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const notice = await getNoticeBySlug(slug);
  if (!notice) return {};

  const title = pick(locale, notice.titleBn, notice.titleEn);
  const path = `/notices/${slug}`;

  return {
    title,
    alternates: pageAlternates(locale, path),
    openGraph: { type: "article", title },
  };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const notice = await getNoticeBySlug(slug);
  if (!notice) notFound();

  const [t, categories, common] = await Promise.all([
    getTranslations("notices"),
    getTranslations("noticeCategory"),
    getTranslations("common"),
  ]);

  const attachments = readAttachments(notice.attachments);

  return (
    <Section>
      <article className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-[color:var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand)]">
            {categories(notice.category)}
          </span>
          <time
            dateTime={notice.publishedAt.toISOString()}
            className="text-[color:var(--muted-foreground)]"
          >
            {t("publishedOn")}: {formatDate(notice.publishedAt, locale)}
          </time>
        </div>

        <h1 className="h1">{pick(locale, notice.titleBn, notice.titleEn)}</h1>

        <RichText html={pick(locale, notice.bodyBn, notice.bodyEn)} className="mt-6" />

        {attachments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold">{t("attachments")}</h2>
            <ul className="mt-3 space-y-2">
              {attachments.map((file) => (
                <li key={file.url}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 text-sm font-medium transition hover:bg-[color:var(--bg-soft)]"
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button asChild variant="outline" size="cta" className="mt-10">
          <Link href="/notices">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {common("back")}
          </Link>
        </Button>
      </article>
    </Section>
  );
}

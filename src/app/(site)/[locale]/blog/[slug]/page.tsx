import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/site/json-ld";
import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { formatDate, pick, toBanglaDigits } from "@/lib/format";
import { getPostBySlug, getRelatedPosts } from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";
import { pageAlternates } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const title = pick(locale, post.titleBn, post.titleEn);
  const path = `/blog/${slug}`;

  return {
    title,
    description: post.excerpt ?? undefined,
    alternates: pageAlternates(locale, path),
    openGraph: {
      type: "article",
      title,
      description: post.excerpt ?? undefined,
      images: post.cover ? [{ url: post.cover }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags,
    },
  };
}

/**
 * Roughly 200 words a minute, which is the figure every reading-time estimate
 * uses. It is a courtesy, not a measurement, so it is never shown as 0.
 */
function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [t, common, settings, related] = await Promise.all([
    getTranslations("blog"),
    getTranslations("common"),
    getSiteSettings(),
    getRelatedPosts(slug, post.tags),
  ]);

  const body = pick(locale, post.bodyBn, post.bodyEn);
  const minutes = readingMinutes(body);
  const path = `/blog/${slug}`;
  const base = locale === "bn" ? `${siteUrl}/bn` : siteUrl;

  return (
    <Section>
      <ArticleJsonLd
        post={post}
        settings={settings}
        locale={locale}
        path={locale === "bn" ? `/bn${path}` : path}
      />
      <BreadcrumbJsonLd
        items={[
          { name: settings.general.shortName || "MUTI", url: base },
          { name: t("title"), url: `${base}/blog` },
          { name: pick(locale, post.titleBn, post.titleEn), url: `${base}${path}` },
        ]}
      />

      <article className="mx-auto max-w-3xl">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--muted-foreground)]">
          {post.publishedAt && (
            <time dateTime={post.publishedAt.toISOString()}>
              {t("publishedOn")}: {formatDate(post.publishedAt, locale)}
            </time>
          )}
          <span aria-hidden="true">·</span>
          <span>
            {t("readingTime", {
              minutes: locale === "bn" ? toBanglaDigits(minutes) : String(minutes),
            })}
          </span>
        </p>

        <h1 className="h1 mt-2">{pick(locale, post.titleBn, post.titleEn)}</h1>

        {/*
          Who checked the medicine. Google's guidance for health content asks
          for it, but the better reason is that a sonologist reading this wants
          to know whose judgement they are borrowing.
        */}
        {post.reviewedBy && (
          <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg bg-[color:var(--bg-soft)] px-3 py-2 text-sm">
            <BadgeCheck
              className="size-4 shrink-0 text-[color:var(--success)]"
              aria-hidden="true"
            />
            <span>
              {t("reviewedBy", { name: post.reviewedBy })}
              {post.reviewedAt && (
                <span className="text-[color:var(--muted-foreground)]">
                  {" · "}
                  {t("reviewedOn", { date: formatDate(post.reviewedAt, locale) })}
                </span>
              )}
            </span>
          </p>
        )}

        {post.cover && (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
            <Image
              src={post.cover}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <RichText html={body} className="mt-6" />

        {post.tags.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-[color:var(--bg-soft)] px-3 py-1 font-latin text-xs font-medium text-[color:var(--muted-foreground)]"
              >
                #{tag}
              </li>
            ))}
          </ul>
        )}

        {post.updatedAt && (
          <p className="mt-6 text-xs text-[color:var(--muted-foreground)]">
            {t("updatedOn")}: {formatDate(post.updatedAt, locale)}
          </p>
        )}

        <Button asChild variant="outline" size="cta" className="mt-10">
          <Link href="/blog">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {common("back")}
          </Link>
        </Button>
      </article>

      {related.length > 0 && (
        <aside className="mx-auto mt-14 max-w-3xl border-t border-[color:var(--border)] pt-8">
          <h2 className="h3">{t("related")}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/blog/${entry.slug}`}
                  className="block h-full rounded-xl border border-[color:var(--border)] bg-white p-4 transition hover:border-[color:var(--brand)]"
                >
                  <h3 className="font-semibold">
                    {pick(locale, entry.titleBn, entry.titleEn)}
                  </h3>
                  {entry.excerpt && (
                    <p className="mt-1 line-clamp-3 text-sm text-[color:var(--muted-foreground)]">
                      {entry.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </Section>
  );
}

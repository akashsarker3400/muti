import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, pick } from "@/lib/format";
import { getPostBySlug } from "@/lib/queries";

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
    alternates: {
      canonical: locale === "bn" ? path : `/en${path}`,
      languages: { bn: path, en: `/en${path}` },
    },
    openGraph: {
      type: "article",
      title,
      description: post.excerpt ?? undefined,
      images: post.cover ? [{ url: post.cover }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
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

  const [t, common] = await Promise.all([
    getTranslations("blog"),
    getTranslations("common"),
  ]);

  return (
    <Section>
      <article className="mx-auto max-w-3xl">
        {post.publishedAt && (
          <time
            dateTime={post.publishedAt.toISOString()}
            className="text-sm text-[color:var(--muted-foreground)]"
          >
            {t("publishedOn")}: {formatDate(post.publishedAt, locale)}
          </time>
        )}

        <h1 className="h1 mt-2">{pick(locale, post.titleBn, post.titleEn)}</h1>

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

        <RichText html={pick(locale, post.bodyBn, post.bodyEn)} className="mt-6" />

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

        <Button asChild variant="outline" size="cta" className="mt-10">
          <Link href="/blog">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {common("back")}
          </Link>
        </Button>
      </article>
    </Section>
  );
}

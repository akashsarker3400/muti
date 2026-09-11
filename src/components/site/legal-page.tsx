import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/page-hero";
import { RichText } from "@/components/site/rich-text";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getPageBySlug } from "@/lib/queries";
import { pageAlternates } from "@/i18n/routing";

/** Shared renderer for the admin-managed legal pages (section 5.18). */
export async function LegalPage({ slug, locale }: { slug: string; locale: Locale }) {
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <PageHero title={pick(locale, page.titleBn, page.titleEn)} />
      <Section>
        <div className="max-w-3xl">
          <RichText html={pick(locale, page.bodyBn, page.bodyEn)} />
        </div>
      </Section>
    </>
  );
}

/** Metadata helper so /privacy and /terms stay one-liners. */
export async function legalMetadata(slug: string, locale: Locale, path: string) {
  const page = await getPageBySlug(slug);
  if (!page) return {};
  return {
    title: pick(locale, page.titleBn, page.titleEn),
    alternates: pageAlternates(locale, path),
    robots: { index: true, follow: true },
  };
}

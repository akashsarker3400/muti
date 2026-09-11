import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GalleryGrid } from "@/components/site/gallery-grid";
import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import { getGalleryAlbums } from "@/lib/queries";
import { cn } from "cn";
import { pageAlternates } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: pageAlternates(locale, "/gallery"),
  };
}

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ album?: string }>;
}) {
  const [{ locale }, { album }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [albums, t] = await Promise.all([
    getGalleryAlbums(),
    getTranslations("gallery"),
  ]);

  const withImages = albums.filter((entry) => entry.images.length > 0);
  const selected = withImages.find((entry) => entry.slug === album);
  const visible = selected ? [selected] : withImages;

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        {withImages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--border)] bg-white p-8 text-center text-[color:var(--muted-foreground)]">
            {t("empty")}
          </p>
        ) : (
          <>
            {withImages.length > 1 && (
              <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("title")}>
                <FilterChip href="/gallery" active={!selected}>
                  {t("allAlbums")}
                </FilterChip>
                {withImages.map((entry) => (
                  <FilterChip
                    key={entry.id}
                    href={`/gallery?album=${entry.slug}`}
                    active={selected?.id === entry.id}
                  >
                    {pick(locale, entry.titleBn, entry.title)}
                  </FilterChip>
                ))}
              </nav>
            )}

            <div className="space-y-10">
              {visible.map((entry) => (
                <div key={entry.id}>
                  <h2 className="h3 mb-4">
                    {pick(locale, entry.titleBn, entry.title)}
                  </h2>
                  <GalleryGrid
                    items={entry.images.map((image) => ({
                      id: image.id,
                      url: image.url,
                      caption: image.caption,
                    }))}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </Section>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
          : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
      )}
    >
      {children}
    </Link>
  );
}

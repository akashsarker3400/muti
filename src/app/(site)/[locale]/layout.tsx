import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";

import "@/app/globals.css";

import { Analytics } from "@/components/site/analytics";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { getPublishedCourses } from "@/lib/queries";
import { siteUrl } from "@/lib/env";
import { getSiteSettings } from "@/lib/site-settings";
import { pick } from "@/lib/format";

export const viewport: Viewport = {
  themeColor: "#1b2a6b",
  width: "device-width",
  initialScale: 1,
};

/**
 * Every public page reads admin-managed content from Postgres, and the Docker
 * image is built without database access (section 12), so pages render per
 * request instead of being prerendered. Staff edits therefore appear
 * immediately, with no cache to purge.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const settings = await getSiteSettings();
  const title = pick(locale, settings.seo.titleBn, settings.seo.titleEn);
  const description = pick(
    locale,
    settings.seo.descriptionBn,
    settings.seo.descriptionEn,
  );
  const name = pick(locale, settings.general.nameBn, settings.general.nameEn);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${settings.general.shortName}`,
    },
    description,
    applicationName: name,
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: {
        bn: "/",
        en: "/en",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: name,
      title,
      description,
      locale: locale === "bn" ? "bn_BD" : "en_US",
      images: settings.seo.ogImage
        ? [{ url: settings.seo.ogImage }]
        : [{ url: "/api/og" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [settings, courses, t, courseT] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getTranslations("common"),
    getTranslations("course"),
  ]);

  return (
    <html lang={locale} className={fontVariables}>
      <body className="flex min-h-dvh flex-col bg-background">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-[color:var(--brand)] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
          >
            {t("skipToContent")}
          </a>

          <AnnouncementBar settings={settings} locale={locale} />
          <SiteHeader settings={settings} locale={locale} courses={courses} />

          <main id="main" className="flex-1">
            {children}
          </main>

          <SiteFooter settings={settings} locale={locale} courses={courses} />
          <WhatsAppFloat
            phone={settings.contact.whatsapp}
            defaultMessage={pick(
              locale,
              settings.whatsapp.defaultMessageBn,
              settings.whatsapp.defaultMessageEn,
            )}
            courseMessages={Object.fromEntries(
              courses.map((course) => [
                course.slug,
                courseT("whatsappPrefill", {
                  course: pick(locale, course.nameBn, course.nameEn),
                }),
              ]),
            )}
          />
          <Toaster position="top-center" richColors />
        </NextIntlClientProvider>

        <Analytics settings={settings} />
      </body>
    </html>
  );
}

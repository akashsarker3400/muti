import type { Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { pick } from "@/lib/format";
import type { PublicVideo } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";
import { isoDuration, parseEmbedUrl } from "@/lib/video";

/**
 * Structured data per section 10. Rendered as a plain script tag so it is in
 * the initial HTML that crawlers read.
 */
function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // The payload comes from our own database, and JSON.stringify escapes
      // the content; `<` is additionally escaped so a stray tag cannot break out.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function OrganizationJsonLd({
  settings,
  locale,
}: {
  settings: SiteSettings;
  locale: Locale;
}) {
  const name = pick(locale, settings.general.nameBn, settings.general.nameEn);
  const phones = [settings.contact.phone1, settings.contact.phone2].filter(Boolean);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name,
        alternateName: settings.general.shortName,
        url: siteUrl,
        logo: `${siteUrl}/logo.svg`,
        email: settings.contact.email,
        telephone: phones,
        foundingDate: String(settings.general.establishedYear),
        identifier: {
          "@type": "PropertyValue",
          name: "Government institute code",
          value: settings.general.govtCode,
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: pick(
            locale,
            settings.contact.addressBn,
            settings.contact.addressEn,
          ),
          addressLocality: "Mymensingh",
          addressCountry: "BD",
        },
        sameAs: [settings.contact.facebook, settings.contact.youtube].filter(Boolean),
      }}
    />
  );
}

export function CourseJsonLd({
  course,
  locale,
  settings,
  url,
}: {
  course: {
    nameBn: string | null;
    nameEn: string;
    fullNameBn: string | null;
    fullNameEn: string;
    overviewBn: string | null;
    overviewEn: string | null;
    courseFee: number;
    durationMonths: number;
  };
  locale: Locale;
  settings: SiteSettings;
  url: string;
}) {
  const description = stripHtml(pick(locale, course.overviewBn, course.overviewEn));

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Course",
        name: pick(locale, course.fullNameBn, course.fullNameEn),
        alternateName: pick(locale, course.nameBn, course.nameEn),
        description: description || undefined,
        url,
        inLanguage: locale === "bn" ? "bn" : "en",
        provider: {
          "@type": "EducationalOrganization",
          name: pick(locale, settings.general.nameBn, settings.general.nameEn),
          url: siteUrl,
        },
        ...(course.courseFee > 0
          ? {
              offers: {
                "@type": "Offer",
                price: course.courseFee,
                priceCurrency: "BDT",
                category: "Tuition",
                url,
              },
            }
          : {}),
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "onsite",
          location: {
            "@type": "Place",
            name: pick(locale, settings.general.nameBn, settings.general.nameEn),
            address: pick(
              locale,
              settings.contact.addressBn,
              settings.contact.addressEn,
            ),
          },
          ...(course.durationMonths > 0
            ? { courseWorkload: `P${course.durationMonths}M` }
            : {}),
        },
      }}
    />
  );
}

export function FaqJsonLd({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: stripHtml(item.answer),
          },
        })),
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/** VideoObject for the institute videos (homepage additions, 2). */
export function VideoJsonLd({
  video,
  settings,
  locale,
}: {
  video: PublicVideo;
  settings: SiteSettings;
  locale: Locale;
}) {
  const embed =
    video.source === "EMBED" && video.embedUrl ? parseEmbedUrl(video.embedUrl) : null;
  const thumbnail = video.posterImage || video.poster?.url || embed?.thumbnail || null;
  const absolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl}${path}`;
  const duration = isoDuration(video.file?.duration);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description || video.title,
    uploadDate: video.createdAt.toISOString(),
    inLanguage: locale,
    publisher: {
      "@type": "EducationalOrganization",
      name: pick(locale, settings.general.nameBn, settings.general.nameEn),
      url: siteUrl,
    },
  };
  if (thumbnail) data.thumbnailUrl = [absolute(thumbnail)];
  if (duration) data.duration = duration;
  if (video.source === "UPLOAD" && video.file)
    data.contentUrl = absolute(video.file.url);
  if (embed)
    data.embedUrl =
      embed.provider === "youtube"
        ? `https://www.youtube.com/embed/${embed.id}`
        : embed.src;
  return <JsonLd data={data} />;
}

/** Book schema for the course book page (addendum 5, A3.7). */
export function BookJsonLd({
  book,
  settings,
  path,
}: {
  book: {
    title: string;
    subtitle: string | null;
    coverImage: string | null;
    pages: number | null;
    edition: string | null;
  };
  settings: SiteSettings;
  path: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Book",
        name: book.subtitle ? `${book.title}: ${book.subtitle}` : book.title,
        author: { "@type": "Organization", name: "MUTI faculty" },
        publisher: {
          "@type": "EducationalOrganization",
          name: settings.general.nameEn,
          url: siteUrl,
        },
        inLanguage: "en",
        url: `${siteUrl}${path}`,
        ...(book.coverImage ? { image: `${siteUrl}${book.coverImage}` } : {}),
        ...(book.pages ? { numberOfPages: book.pages } : {}),
        ...(book.edition ? { bookEdition: book.edition } : {}),
        bookFormat: "https://schema.org/Paperback",
      }}
    />
  );
}

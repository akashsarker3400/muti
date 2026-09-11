import type { Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { pick } from "@/lib/format";
import type { SiteSettings } from "@/lib/site-settings";

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

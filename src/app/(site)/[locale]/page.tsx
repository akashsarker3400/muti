import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContactStrip } from "@/components/site/contact-strip";
import { CourseCard } from "@/components/site/course-card";
import { FacultyCard } from "@/components/site/faculty-card";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { Hero } from "@/components/site/home/hero";
import { NextBatchCta } from "@/components/site/home/next-batch";
import { PracticalBlock } from "@/components/site/home/practical-block";
import { StatsStrip } from "@/components/site/home/stats-strip";
import { WhyChoose } from "@/components/site/home/why-choose";
import { OrganizationJsonLd } from "@/components/site/json-ld";
import { NoticeList } from "@/components/site/notice-list";
import { PartnersRow } from "@/components/site/partners-row";
import { Section, SectionHeading } from "@/components/site/section";
import { TestimonialsCarousel } from "@/components/site/testimonials-carousel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getFaculty,
  getGalleryPreview,
  getNextBatch,
  getNextBatchByCourse,
  getNotices,
  getPartners,
  getPublishedCourses,
  getTestimonials,
} from "@/lib/queries";
import { getSiteSettings } from "@/lib/site-settings";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [
    settings,
    courses,
    nextBatch,
    notices,
    partners,
    testimonials,
    faculty,
    galleryImages,
    batchByCourse,
    home,
    common,
  ] = await Promise.all([
    getSiteSettings(),
    getPublishedCourses(),
    getNextBatch(),
    getNotices({ take: 5 }),
    getPartners(),
    getTestimonials(8),
    getFaculty(4),
    getGalleryPreview(8),
    getNextBatchByCourse(),
    getTranslations("home"),
    getTranslations("common"),
  ]);

  return (
    <>
      <Hero settings={settings} locale={locale} />

      <StatsStrip settings={settings} locale={locale} courseCount={courses.length} />

      {courses.length > 0 && (
        <Section>
          <SectionHeading
            title={home("coursesTitle")}
            subtitle={home("coursesSubtitle")}
            action={
              <Button asChild variant="brandOutline" size="cta">
                <Link href="/courses">
                  {common("viewAll")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                locale={locale}
                settings={settings}
                batch={batchByCourse.get(course.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <WhyChoose locale={locale} limit={8} />

      <PracticalBlock settings={settings} locale={locale} />

      <NextBatchCta batch={nextBatch} locale={locale} />

      <PartnersRow partners={partners} soft />

      {notices.length > 0 && (
        <Section>
          <SectionHeading
            title={home("noticesTitle")}
            action={
              <Button asChild variant="brandOutline" size="cta">
                <Link href="/notices">
                  {common("viewAll")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <NoticeList notices={notices} locale={locale} />
        </Section>
      )}

      {testimonials.length > 0 && (
        <Section soft>
          <SectionHeading title={home("testimonialsTitle")} align="center" />
          <TestimonialsCarousel
            items={testimonials.map((item) => ({
              id: item.id,
              name: item.name,
              batch: item.batch,
              course: item.course,
              text: item.text,
              photo: item.photo,
              rating: item.rating,
            }))}
          />
        </Section>
      )}

      {faculty.length > 0 && (
        <Section>
          <SectionHeading
            title={home("facultyTitle")}
            action={
              <Button asChild variant="brandOutline" size="cta">
                <Link href="/faculty">
                  {common("viewAll")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {faculty.map((member) => (
              <FacultyCard key={member.id} member={member} locale={locale} compact />
            ))}
          </div>
        </Section>
      )}

      {galleryImages.length > 0 && (
        <Section soft>
          <SectionHeading
            title={home("galleryTitle")}
            action={
              <Button asChild variant="brandOutline" size="cta">
                <Link href="/gallery">
                  {common("viewAll")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <GalleryGrid
            items={galleryImages.map((image) => ({
              id: image.id,
              url: image.url,
              caption: image.caption,
              album: image.album.title,
            }))}
          />
        </Section>
      )}

      <ContactStrip settings={settings} locale={locale} soft={false} />

      <OrganizationJsonLd settings={settings} locale={locale} />
    </>
  );
}

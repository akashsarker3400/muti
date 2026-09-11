import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pick, toBanglaDigits } from "@/lib/format";
import type { PublicCourseBook } from "@/lib/queries";

/**
 * "Course book" block on a course page (addendum 5, A3): cover thumbnail,
 * the first five chapter titles and a link to the book page. DMU adds the
 * "used in 1st semester" line.
 */
export async function CourseBookSection({
  book,
  courseCode,
  locale,
}: {
  book: PublicCourseBook | null;
  courseCode: string;
  locale: Locale;
}) {
  if (!book) return null;
  const t = await getTranslations("book");
  const digits = (value: number) =>
    locale === "bn" ? toBanglaDigits(String(value)) : String(value);
  const shown = book.chapters.slice(0, 5);
  const rest = book.chapters.length - shown.length;

  return (
    <div data-testid="course-book-section">
      <h2 className="h3 mb-4">{t("courseSectionTitle")}</h2>
      <div className="flex flex-col gap-5 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-5 sm:flex-row">
        <Link
          href={`/course-book/${book.slug}`}
          className="shrink-0 self-start"
          tabIndex={-1}
          aria-hidden="true"
        >
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt=""
              width={96}
              height={135}
              className="h-[135px] w-[96px] rounded-md object-cover shadow-[var(--shadow-card)]"
            />
          ) : (
            <span className="grid h-[135px] w-[96px] place-items-center rounded-md bg-[color:var(--brand)] text-white shadow-[var(--shadow-card)]">
              <BookOpen className="size-8" aria-hidden="true" />
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-[color:var(--brand)]">
            {book.title}
            {book.subtitle && (
              <span className="font-medium text-[color:var(--muted-foreground)]">
                : {book.subtitle}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            {t("courseSectionLine", { count: digits(book.chapters.length) })}
            {courseCode === "DMU" && ` · ${t("usedFirstSemester")}`}
          </p>
          <ol className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {shown.map((chapter) => (
              <li key={chapter.id} className="flex gap-2">
                <span className="font-latin text-[color:var(--muted-foreground)]">
                  {String(chapter.number).padStart(2, "0")}
                </span>
                {pick(locale, chapter.titleBn, chapter.title)}
              </li>
            ))}
            {rest > 0 && (
              <li className="text-[color:var(--muted-foreground)]">
                {t("andMore", { count: digits(rest) })}
              </li>
            )}
          </ol>
          <Button asChild variant="brandOutline" size="cta" className="mt-4">
            <Link href={`/course-book/${book.slug}`}>
              {t("viewBook")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

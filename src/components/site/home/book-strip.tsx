import Image from "next/image";
import { ArrowRight, BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { PublicCourseBook } from "@/lib/queries";

/**
 * Slim homepage strip for the course book (addendum 5, A3): cover thumbnail
 * on the left, one line of text and a button. Hidden when there is no
 * published book or the office switched it off in Site Settings.
 */
export async function BookStrip({ book }: { book: PublicCourseBook | null }) {
  if (!book) return null;
  const t = await getTranslations("book");
  const href = `/course-book/${book.slug}`;

  return (
    <section className="py-2">
      <div className="container-content">
        <div
          className="flex flex-col items-center gap-5 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-5 sm:flex-row sm:gap-6 sm:p-6"
          data-testid="book-strip"
        >
          <Link href={href} className="shrink-0" aria-hidden="true" tabIndex={-1}>
            {book.coverImage ? (
              <Image
                src={book.coverImage}
                alt=""
                width={88}
                height={124}
                className="h-[124px] w-[88px] rounded-md object-cover shadow-[var(--shadow-card)]"
              />
            ) : (
              <span className="grid h-[124px] w-[88px] place-items-center rounded-md bg-[color:var(--brand)] text-white shadow-[var(--shadow-card)]">
                <BookOpen className="size-8" aria-hidden="true" />
              </span>
            )}
          </Link>
          <div className="min-w-0 flex-1 text-center sm:text-start">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2 className="mt-1 text-xl font-bold text-[color:var(--brand)] sm:text-2xl">
              {t("homeStripTitle", { title: book.title })}
            </h2>
            <p className="mt-1 text-[color:var(--muted-foreground)]">
              {t("homeStripBody")}
            </p>
          </div>
          <Button asChild variant="brand" size="cta" className="shrink-0">
            <Link href={href}>
              {t("viewBook")}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

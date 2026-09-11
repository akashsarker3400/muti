import { CalendarDays, Clock, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section } from "@/components/site/section";
import { SeatCounter } from "@/components/site/seat-counter";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, formatNumber, pick } from "@/lib/format";
import { seatState } from "@/lib/seats";
import type { getNextBatch } from "@/lib/queries";

type NextBatch = Awaited<ReturnType<typeof getNextBatch>>;

/**
 * Next upcoming batch plus the free-class CTA (section 5.1 item 7). The whole
 * block is skipped when the admin has no upcoming batch published.
 */
export async function NextBatchCta({
  batch,
  locale,
}: {
  batch: NextBatch;
  locale: Locale;
}) {
  if (!batch) return null;

  const [home, common, seatsT] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("seats"),
  ]);

  // Live seat counter (addendum 2, A1).
  const seats = seatState(batch);
  const seatsFull = seats.show && seats.full;

  const courseName = pick(locale, batch.course.nameBn, batch.course.nameEn);
  const start = batch.startDate
    ? formatDate(batch.startDate, locale)
    : common("startingSoon");

  return (
    <Section>
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--brand)] text-white">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-10 md:p-9">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[color:var(--highlight)] uppercase">
              {home("nextBatchTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              {batch.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="text-white/75">{courseName}</p>
              <SeatCounter batch={batch} locale={locale} onDark />
            </div>

            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <dt className="flex items-center gap-2 text-white/70">
                  <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                  {home("nextBatchStarts")}:
                </dt>
                <dd className="font-semibold">{start}</dd>
              </div>
              {batch.classDays && (
                <div className="flex items-center gap-2">
                  <dt className="flex items-center gap-2 text-white/70">
                    <Clock className="size-4 shrink-0" aria-hidden="true" />
                    <span className="sr-only">{home("classDaysLabel")}</span>
                  </dt>
                  <dd className="font-semibold">
                    {batch.classDays}
                    {batch.classTime ? ` · ${batch.classTime}` : ""}
                  </dd>
                </div>
              )}
              {batch.seats != null && batch.seats > 0 && (
                <div className="flex items-center gap-2">
                  <dt className="flex items-center gap-2 text-white/70">
                    <Users className="size-4 shrink-0" aria-hidden="true" />
                    <span className="sr-only">{home("seatsLabel")}</span>
                  </dt>
                  <dd className="nums font-semibold">
                    {formatNumber(batch.seats, locale)}
                  </dd>
                </div>
              )}
            </dl>

            <p className="mt-4 max-w-lg text-sm text-white/75">
              {seatsFull ? seatsT("fullNotice") : home("freeClassNote")}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <Button
              asChild
              size="cta-lg"
              className="w-full bg-[color:var(--highlight)] text-[color:var(--brand-dark)] hover:bg-[color-mix(in_oklab,var(--highlight),black_8%)] md:w-auto"
            >
              <Link href="/free-class">{home("freeClassCta")}</Link>
            </Button>
            <Button asChild variant="accent" size="cta-lg" className="w-full md:w-auto">
              <Link
                href={
                  seatsFull
                    ? `/apply?course=${batch.course.slug}&waitlist=1`
                    : `/apply?course=${batch.course.slug}`
                }
              >
                {seatsFull ? seatsT("joinWaitlist") : common("applyNow")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

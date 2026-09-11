import { ArrowRight, Clock, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AdmissionBadge, LevelBadge } from "@/components/site/badges";
import { WhatsAppIcon } from "@/components/site/icons";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { courseFeeLabel, durationLabel } from "@/lib/course";
import { pick } from "@/lib/format";
import type { PublicCourse } from "@/lib/queries";
import type { SiteSettings } from "@/lib/site-settings";
import { waLink } from "@/lib/whatsapp";

export async function CourseCard({
  course,
  locale,
  settings,
}: {
  course: PublicCourse;
  locale: Locale;
  settings: SiteSettings;
}) {
  const [common, levels, coursesT, courseT] = await Promise.all([
    getTranslations("common"),
    getTranslations("levels"),
    getTranslations("courses"),
    getTranslations("course"),
  ]);

  const name = pick(locale, course.nameBn, course.nameEn);
  const fullName = pick(locale, course.fullNameBn, course.fullNameEn);

  const duration = durationLabel(course, locale, {
    months: (n) => courseT("durationMonths", { months: n }),
    contact: common("contactForDuration"),
  });
  const fee = courseFeeLabel(course, locale, common("contactForFee"));

  return (
    <article className="group flex h-full flex-col rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <LevelBadge label={levels(course.level)} />
        {course.admissionOpen && (
          <AdmissionBadge
            open
            labelOpen={common("admissionOpen")}
            labelClosed={common("admissionClosed")}
          />
        )}
      </div>

      <p className="font-latin text-xs font-semibold tracking-wide text-[color:var(--muted-foreground)]">
        {coursesT("code")} · {course.code}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[color:var(--brand)]">
        <Link
          href={`/courses/${course.slug}`}
          className="transition group-hover:underline"
        >
          {name}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted-foreground)]">
        {fullName}
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="flex items-center gap-2 text-[color:var(--muted-foreground)]">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {coursesT("duration")}:
          </dt>
          <dd className="font-medium">{duration}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="flex items-center gap-2 text-[color:var(--muted-foreground)]">
            <Wallet className="size-4 shrink-0" aria-hidden="true" />
            {coursesT("courseFee")}:
          </dt>
          <dd className="nums font-semibold text-[color:var(--brand)]">{fee}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-2 pt-1">
        <Button asChild variant="brand" size="cta" className="flex-1">
          <Link href={`/courses/${course.slug}`}>
            {common("details")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          asChild
          variant="whatsapp"
          size="icon-cta"
          aria-label={common("whatsapp")}
        >
          <a
            href={waLink(
              settings.contact.whatsapp,
              courseT("whatsappPrefill", { course: name }),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="size-5" />
          </a>
        </Button>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, CircleSlash } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHero } from "@/components/site/page-hero";
import { Section } from "@/components/site/section";
import type { Locale } from "@/i18n/routing";
import { verifyCardToken } from "@/lib/card-token";
import { requiredEnv } from "@/lib/env";
import { formatDate, pick } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Card pages are for the person holding the card, never for search engines. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_TONE = {
  ACTIVE: "success",
  COMPLETED: "brand",
  DROPPED: "danger",
} as const;

/**
 * Student card verification (docs/id-card-certificate-proposal.md, stage 4).
 * Reached only by scanning the QR on a printed card: the token is signed, so
 * the page cannot be found by guessing a roll number.
 *
 * It shows the photo, because matching the face on the card to the face on
 * the screen is the check that catches a forged card. Nothing contactable is
 * shown: no phone, no address, no parents.
 */
export default async function CardPage({
  params,
}: {
  params: Promise<{ locale: Locale; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const studentId = verifyCardToken(token, requiredEnv("AUTH_SECRET"));
  if (!studentId) notFound();

  const [settings, student, t] = await Promise.all([
    getSiteSettings(),
    prisma.student.findUnique({
      where: { id: studentId },
      include: { course: true, batch: true },
    }),
    getTranslations("card"),
  ]);
  if (!student) notFound();

  const active = student.status !== "DROPPED";
  const tone = STATUS_TONE[student.status];

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <div className="mx-auto max-w-xl" data-testid="card-check">
          <div className="overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]">
            <div
              className={`flex items-center gap-2 px-5 py-3 text-white ${
                active ? "bg-[color:var(--success)]" : "bg-[color:var(--error)]"
              }`}
            >
              {active ? (
                <BadgeCheck className="size-5" aria-hidden="true" />
              ) : (
                <CircleSlash className="size-5" aria-hidden="true" />
              )}
              <p className="font-semibold">{active ? t("valid") : t("invalid")}</p>
            </div>

            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
              <span className="mx-auto w-[128px] shrink-0 overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] sm:mx-0">
                {student.photo ? (
                  <Image
                    src={student.photo}
                    alt=""
                    width={128}
                    height={160}
                    className="aspect-[4/5] w-full object-cover object-top"
                  />
                ) : (
                  <span className="grid aspect-[4/5] w-full place-items-center text-3xl font-bold text-[color:var(--brand)]">
                    {student.name.trim().charAt(0)}
                  </span>
                )}
              </span>

              <dl className="min-w-0 flex-1 space-y-2 text-sm">
                <Row
                  label={t("name")}
                  value={pick(locale, student.nameBn, student.name)}
                />
                <Row label={t("roll")} value={student.roll} latin />
                <Row
                  label={t("course")}
                  value={pick(
                    locale,
                    student.course.fullNameBn,
                    student.course.fullNameEn,
                  )}
                />
                {student.batch && <Row label={t("batch")} value={student.batch.name} />}
                <Row label={t("status")} value={t(`statusOptions.${student.status}`)} />
                {student.admissionDate && (
                  <Row
                    label={t("admitted")}
                    value={formatDate(student.admissionDate, locale)}
                  />
                )}
              </dl>
            </div>

            <p
              className={`border-t border-[color:var(--border)] px-5 py-3 text-xs text-[color:var(--muted-foreground)] ${
                tone === "danger" ? "bg-red-50" : ""
              }`}
            >
              {t("note", {
                institute: pick(
                  locale,
                  settings.general.nameBn,
                  settings.general.nameEn,
                ),
              })}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function Row({
  label,
  value,
  latin = false,
}: {
  label: string;
  value: string;
  latin?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className={`min-w-0 flex-1 font-medium ${latin ? "font-latin" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

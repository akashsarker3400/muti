"use client";

import { useCallback, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field, selectClass } from "@/components/site/forms/field";
import { Turnstile } from "@/components/site/turnstile";
import { LookupNotice } from "@/components/site/verify-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchBoardResults,
  type FoundResult,
  type ResultMode,
  type ResultSearch,
} from "@/app/actions/results";
import type { Locale } from "@/i18n/routing";
import { formatDate, toBanglaDigits } from "@/lib/format";
import { parseFailedSubjects } from "@/lib/verify";

const STATUS_TONE: Record<FoundResult["status"], string> = {
  PASS: "bg-[color:var(--success)] text-white",
  FAIL: "bg-[color:var(--error)] text-white",
  WITHHELD: "bg-[color:var(--muted-foreground)] text-white",
  ABSENT: "bg-[color:var(--warning)] text-[color:var(--brand-dark)]",
};

/**
 * Roll / registration search (addendum 3, §2). The subject-code legend comes
 * from Site Settings and is shown as a tooltip on each failed-subject chip.
 */
export function ResultsSearch({
  locale,
  exams,
  subjectCodes,
  turnstileSiteKey,
  whatsappHref,
}: {
  locale: Locale;
  exams: Array<{ id: string; label: string }>;
  subjectCodes: Record<string, string>;
  turnstileSiteKey: string;
  whatsappHref: string;
}) {
  const t = useTranslations("results");
  const common = useTranslations("common");

  const [mode, setMode] = useState<ResultMode>("roll");
  const [query, setQuery] = useState("");
  const [examId, setExamId] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<ResultSearch | null>(null);
  const [pending, startTransition] = useTransition();
  const onToken = useCallback((value: string) => setToken(value), []);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setResult(
        await searchBoardResults({
          mode,
          query,
          examId: examId || undefined,
          turnstileToken: token,
        }),
      );
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={onSubmit}
        method="post"
        className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium">{t("searchBy")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["roll", "registration", "bmdc"] as const).map((option) => (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
                  mode === option
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[color:var(--border)] hover:bg-[color:var(--bg-soft)]"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => {
                    setMode(option);
                    setResult(null);
                  }}
                  className="accent-[color:var(--brand)]"
                />
                {t(`mode.${option}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("exam")} className="sm:col-span-2">
            {(props) => (
              <select
                {...props}
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
                className={selectClass}
              >
                <option value="">{t("allExams")}</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label={t(`inputLabel.${mode}`)}
            required
            hint={t(`hint.${mode}`)}
            error={result?.status === "invalid" ? t("invalid") : undefined}
            className="sm:col-span-2"
          >
            {(props) => (
              <Input
                {...props}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(`placeholder.${mode}`)}
                inputMode={mode === "bmdc" ? "text" : "numeric"}
                dir="ltr"
                autoComplete="off"
                className="h-11 font-latin"
              />
            )}
          </Field>
        </div>

        <div className="mt-4">
          <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />
        </div>

        <Button
          type="submit"
          variant="brand"
          size="cta-lg"
          className="mt-4 w-full sm:w-auto"
          disabled={pending || query.trim().length < 4}
        >
          {pending ? common("loading") : t("searchButton")}
        </Button>
      </form>

      <div aria-live="polite" className="mt-6 space-y-4">
        {result?.status === "found" &&
          result.results.map((row) => (
            <ResultCard
              key={row.id}
              row={row}
              locale={locale}
              subjectCodes={subjectCodes}
            />
          ))}
        {result?.status === "not-found" && (
          <LookupNotice
            tone="warning"
            title={t("notFound")}
            whatsappHref={whatsappHref}
          />
        )}
        {result?.status === "rate-limited" && (
          <LookupNotice tone="error" title={t("rateLimited")} />
        )}
        {result?.status === "captcha" && (
          <LookupNotice tone="error" title={t("captcha")} />
        )}
      </div>
    </div>
  );
}

function ResultCard({
  row,
  locale,
  subjectCodes,
}: {
  row: FoundResult;
  locale: Locale;
  subjectCodes: Record<string, string>;
}) {
  const t = useTranslations("results");
  const digits = (value: string) => (locale === "bn" ? toBanglaDigits(value) : value);
  const failed = parseFailedSubjects(row.failedSubjects);

  return (
    <article
      className="overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]"
      data-testid="result-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-5 py-3">
        <div>
          <h2 className="font-latin text-base font-semibold">{row.examTitle}</h2>
          <p className="font-latin text-xs text-[color:var(--muted-foreground)]">
            {[row.boardName, row.session, row.heldIn].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[row.status]}`}
        >
          {t(`status.${row.status}`)}
          {row.status === "PASS" && row.gpa && (
            <span className="font-latin">· GPA {digits(row.gpa)}</span>
          )}
        </span>
      </header>

      <dl className="grid gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-2">
        <Row label={t("roll")} value={digits(row.roll)} />
        {row.registrationNo && (
          <Row label={t("registration")} value={digits(row.registrationNo)} />
        )}
        {row.studentName && <Row label={t("studentName")} value={row.studentName} />}
        {(row.courseBn || row.courseEn) && (
          <Row
            label={t("course")}
            value={(locale === "bn" ? row.courseBn : row.courseEn) ?? ""}
          />
        )}
        {row.publishedOn && (
          <Row label={t("publishedOn")} value={formatDate(row.publishedOn, locale)} />
        )}
        {row.remark && <Row label={t("remark")} value={row.remark} />}
      </dl>

      {row.status === "FAIL" && failed.length > 0 && (
        <div className="border-t border-[color:var(--border)] px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-[color:var(--muted-foreground)]">
            {t("failedSubjects")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {failed.map((subject) => (
              <li
                key={`${subject.code}-${subject.parts.join("")}`}
                title={subjectCodes[subject.code]}
                className="inline-flex items-center gap-1 rounded-md border border-[color:var(--error)]/30 bg-[color:var(--error)]/8 px-2 py-1 font-latin text-xs font-semibold text-[color:var(--error)]"
              >
                {subject.code}
                {subject.parts.length > 0 && (
                  <span className="font-normal opacity-80">
                    [{subject.parts.join(",")}]
                  </span>
                )}
                {subjectCodes[subject.code] && (
                  <span className="sr-only">: {subjectCodes[subject.code]}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-[color:var(--muted-foreground)]">
            {t("legend")}
          </p>
        </div>
      )}

      {row.noticeFile && (
        <div className="border-t border-[color:var(--border)] px-5 py-3">
          <Button asChild variant="brandOutline" size="cta">
            <a href={row.noticeFile} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" aria-hidden="true" />
              {t("downloadNotice")}
            </a>
          </Button>
        </div>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:justify-start sm:gap-0">
      <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className="font-latin font-medium">{value}</dd>
    </div>
  );
}

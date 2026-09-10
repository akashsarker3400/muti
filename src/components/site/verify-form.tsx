"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, SearchX, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Field } from "@/components/site/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyCertificate, type VerifyResult } from "@/app/actions/verify";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";

export function VerifyForm({ locale }: { locale: Locale }) {
  const t = useTranslations("verify");
  const common = useTranslations("common");

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setResult(await verifyCertificate(query));
    });
  }

  return (
    <div className="max-w-xl">
      <form
        onSubmit={onSubmit}
        className="rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <Field label={t("inputLabel")} required>
          {(props) => (
            <Input
              {...props}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("inputPlaceholder")}
              dir="ltr"
              required
              minLength={3}
              className="h-11 font-latin"
            />
          )}
        </Field>

        <Button
          type="submit"
          variant="brand"
          size="cta"
          disabled={pending}
          className="mt-4 w-full sm:w-auto"
        >
          {pending ? common("loading") : t("verifyButton")}
        </Button>
      </form>

      {result?.status === "valid" && (
        <div className="mt-5 rounded-[14px] border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-5 sm:p-6">
          <p className="flex items-center gap-2 font-semibold text-[color:var(--success)]">
            <BadgeCheck className="size-5" aria-hidden="true" />
            {t("valid")}
          </p>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label={t("studentName")} value={result.name} latin />
            <Row label={t("courseName")} value={result.course} latin />
            {result.batch && <Row label={t("batchName")} value={result.batch} latin />}
            {result.completionDate && (
              <Row
                label={t("completionDate")}
                value={formatDate(result.completionDate, locale)}
              />
            )}
            {result.grade && <Row label="Grade" value={result.grade} latin />}
          </dl>
        </div>
      )}

      {result?.status === "not-found" && (
        <p className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-5 text-sm">
          <SearchX
            className="mt-0.5 size-5 shrink-0 text-[color:var(--muted-foreground)]"
            aria-hidden="true"
          />
          {t("notFound")}
        </p>
      )}

      {result?.status === "rate-limited" && (
        <p className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-5 text-sm">
          <ShieldAlert
            className="mt-0.5 size-5 shrink-0 text-[color:var(--warning)]"
            aria-hidden="true"
          />
          {t("rateLimited")}
        </p>
      )}
    </div>
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
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className={latin ? "font-latin font-medium" : "font-medium"}>{value}</dd>
    </div>
  );
}

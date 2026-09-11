"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Field } from "@/components/site/forms/field";
import { Turnstile } from "@/components/site/turnstile";
import { CertificateCard, LookupNotice } from "@/components/site/verify-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  verifyCertificate,
  type VerifyMode,
  type VerifyResult,
} from "@/app/actions/verify";
import type { Locale } from "@/i18n/routing";

/**
 * Certificate lookup by certificate number or BMDC number (addendum 3, §1).
 * The radio changes the helper text and the placeholder; the server does the
 * normalisation so "A-12345", "a 12345" and "12345" all find the same doctor.
 */
export function VerifyForm({
  locale,
  turnstileSiteKey,
  whatsappHref,
}: {
  locale: Locale;
  turnstileSiteKey: string;
  whatsappHref: string;
}) {
  const t = useTranslations("verify");
  const common = useTranslations("common");

  const [mode, setMode] = useState<VerifyMode>("certificate");
  const [query, setQuery] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [pending, startTransition] = useTransition();
  const onToken = useCallback((value: string) => setToken(value), []);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      setResult(await verifyCertificate({ mode, query, turnstileToken: token }));
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
            {(["certificate", "bmdc"] as const).map((option) => (
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

        <Field
          label={t(`inputLabel.${mode}`)}
          required
          hint={t(`hint.${mode}`)}
          error={result?.status === "invalid" ? t("invalid") : undefined}
        >
          {(props) => (
            <Input
              {...props}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(`placeholder.${mode}`)}
              dir="ltr"
              autoComplete="off"
              className="h-11 font-latin"
            />
          )}
        </Field>

        <div className="mt-4">
          <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />
        </div>

        <Button
          type="submit"
          variant="brand"
          size="cta-lg"
          className="mt-4 w-full sm:w-auto"
          disabled={pending || query.trim().length < 3}
        >
          {pending ? common("loading") : t("verifyButton")}
        </Button>
      </form>

      <div aria-live="polite" className="mt-6 space-y-4">
        {result?.status === "found" &&
          result.certificates.map((certificate) => (
            <CertificateCard
              key={certificate.certificateNo}
              certificate={certificate}
              locale={locale}
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

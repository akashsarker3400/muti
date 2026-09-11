"use client";

import { useCallback, useState, useTransition } from "react";
import { CheckCircle2, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { errorText, Field, Honeypot, selectClass } from "@/components/site/forms/field";
import { WhatsAppIcon } from "@/components/site/icons";
import { Turnstile } from "@/components/site/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestHealthSerial } from "@/app/actions/health";
import type { Locale } from "@/i18n/routing";
import { toBanglaDigits } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

type Values = {
  name: string;
  phone: string;
  age: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  area: string;
  complaint: string;
  preferredDate: string;
  referredBy: string;
  website: string;
};

/**
 * Patient serial form (addendum 4, §3). Two required fields, everything else
 * optional, big call button first — many patients will phone instead.
 */
export function HealthSerialForm({
  locale,
  phone,
  whatsapp,
  address,
  turnstileSiteKey,
}: {
  locale: Locale;
  phone: string;
  whatsapp: string;
  address: string;
  turnstileSiteKey: string;
}) {
  const t = useTranslations("health");
  const form = useTranslations("form");
  const common = useTranslations("common");

  const [token, setToken] = useState("");
  const onToken = useCallback((value: string) => setToken(value), []);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ name: string; serialNo: number } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      name: "",
      phone: "",
      age: "",
      gender: "",
      area: "",
      complaint: "",
      preferredDate: "",
      referredBy: "",
      website: "",
    },
  });

  const digits = (value: string | number) =>
    locale === "bn" ? toBanglaDigits(String(value)) : String(value);

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await requestHealthSerial({ ...values, turnstileToken: token });
      if (result.ok) {
        setDone({ name: values.name, serialNo: result.serialNo });
        return;
      }
      if (result.errors) {
        for (const [field, key] of Object.entries(result.errors)) {
          setError(field as keyof Values, { message: errorText(form, key) });
        }
        toast.error(errorText(form, "generic"));
        return;
      }
      toast.error(
        result.error === "rateLimited"
          ? errorText(form, "rateLimited")
          : result.error === "captcha"
            ? t("captcha")
            : errorText(form, "generic"),
      );
    });
  }

  if (done) {
    return (
      <div
        className="rounded-[14px] border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-6 text-center sm:p-8"
        data-testid="health-serial-success"
      >
        <CheckCircle2
          className="mx-auto size-12 text-[color:var(--success)]"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-[color:var(--muted-foreground)]">
          {t("serialYourNumber")}
        </p>
        <p className="font-latin text-5xl font-bold text-[color:var(--brand)]">
          {digits(done.serialNo)}
        </p>
        <p className="mt-3 text-[color:var(--muted-foreground)]">
          {t("serialSuccessBody")}
        </p>
        <p className="mt-4 inline-flex items-start gap-2 text-start text-sm">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-[color:var(--accent-red)]"
            aria-hidden="true"
          />
          {address}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="whatsapp" size="cta-lg">
            <a
              href={waLink(
                whatsapp,
                t("whatsappPrefill", {
                  name: done.name,
                  serialNo: digits(done.serialNo),
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="size-5" />
              {common("whatsapp")}
            </a>
          </Button>
          <Button asChild variant="brandOutline" size="cta-lg">
            <a href={`tel:${phone}`}>
              <Phone className="size-4" aria-hidden="true" />
              {common("callNow")}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        asChild
        variant="accent"
        size="cta-lg"
        className="w-full justify-center text-base"
      >
        <a href={`tel:${phone}`}>
          <Phone className="size-5" aria-hidden="true" />
          {t("callForSerial", { phone })}
        </a>
      </Button>
      <p className="text-center text-sm text-[color:var(--muted-foreground)]">
        {t("orFillForm")}
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        method="post"
        className="relative rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <Honeypot {...register("website")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={form("fullName")}
            required
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <Input
                {...props}
                {...register("name", { required: errorText(form, "nameRequired") })}
                autoComplete="name"
                className="h-12 text-base"
              />
            )}
          </Field>
          <Field label={form("phone")} required error={errors.phone?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("phone", { required: errorText(form, "phoneRequired") })}
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder={form("phonePlaceholder")}
                autoComplete="tel"
                className="h-12 font-latin text-base"
              />
            )}
          </Field>
          <Field label={t("age")} error={errors.age?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("age")}
                inputMode="numeric"
                dir="ltr"
                className="h-12 font-latin text-base"
              />
            )}
          </Field>
          <Field label={t("gender")} error={errors.gender?.message}>
            {(props) => (
              <select
                {...props}
                {...register("gender")}
                className={`${selectClass} h-12 text-base`}
              >
                <option value="">{form("selectPlaceholder")}</option>
                <option value="MALE">{t("genderMale")}</option>
                <option value="FEMALE">{t("genderFemale")}</option>
                <option value="OTHER">{t("genderOther")}</option>
              </select>
            )}
          </Field>
          <Field label={t("area")} error={errors.area?.message}>
            {(props) => (
              <Input {...props} {...register("area")} className="h-12 text-base" />
            )}
          </Field>
          <Field
            label={t("complaint")}
            error={errors.complaint?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <Input
                {...props}
                {...register("complaint")}
                placeholder={t("complaintPlaceholder")}
                className="h-12 text-base"
              />
            )}
          </Field>
          <Field label={t("preferredDate")} error={errors.preferredDate?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("preferredDate")}
                type="date"
                dir="ltr"
                className="h-12 font-latin text-base"
              />
            )}
          </Field>
          <Field label={t("referredBy")} error={errors.referredBy?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("referredBy")}
                className="h-12 text-base"
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
          disabled={pending}
          className="mt-5 w-full sm:w-auto"
        >
          {pending ? common("submitting") : t("submitSerial")}
        </Button>
        <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
          {t("privacyNote")}
        </p>
      </form>
    </div>
  );
}

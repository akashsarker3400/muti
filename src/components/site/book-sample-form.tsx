"use client";

import { useCallback, useState, useTransition } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { requestBookSample } from "@/app/actions/book";
import { errorText, Field, Honeypot, selectClass } from "@/components/site/forms/field";
import { WhatsAppIcon } from "@/components/site/icons";
import { Turnstile } from "@/components/site/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { waLink } from "@/lib/whatsapp";

type Values = {
  name: string;
  phone: string;
  email: string;
  qualification: "" | "MBBS" | "INTERN" | "OTHER";
  courseId: string;
  consent: boolean;
  website: string;
};

/**
 * Sample chapter lead form (addendum 5, A4). On success the download button
 * carries a signed 24-hour token; the PDF itself is never linked directly.
 */
export function BookSampleForm({
  slug,
  courses,
  whatsapp,
  turnstileSiteKey,
}: {
  slug: string;
  courses: Array<{ id: string; label: string }>;
  whatsapp: string;
  turnstileSiteKey: string;
}) {
  const t = useTranslations("book");
  const form = useTranslations("form");
  const common = useTranslations("common");
  const [token, setToken] = useState("");
  const onToken = useCallback((value: string) => setToken(value), []);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ token: string; emailed: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      qualification: "",
      courseId: "",
      consent: true,
      website: "",
    },
  });

  function onSubmit(values: Values) {
    startTransition(async () => {
      const result = await requestBookSample(slug, {
        ...values,
        turnstileToken: token,
      });
      if (result.ok) {
        setDone({ token: result.token, emailed: result.emailed });
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
          : result.error === "unavailable"
            ? t("unavailable")
            : result.error === "captcha"
              ? errorText(form, "generic")
              : errorText(form, "generic"),
      );
    });
  }

  if (done) {
    return (
      <div
        className="rounded-[14px] border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-6 text-center sm:p-8"
        data-testid="book-sample-success"
      >
        <CheckCircle2
          className="mx-auto size-12 text-[color:var(--success)]"
          aria-hidden="true"
        />
        <h3 className="mt-3 text-xl font-bold text-[color:var(--brand)]">
          {t("successTitle")}
        </h3>
        <p className="mt-2 text-[color:var(--muted-foreground)]">{t("successBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="accent" size="cta-lg">
            <a
              href={`/api/v1/book/sample?token=${encodeURIComponent(done.token)}`}
              data-testid="book-sample-download"
            >
              <Download className="size-5" aria-hidden="true" />
              {t("downloadPdf")}
            </a>
          </Button>
          <Button asChild variant="whatsapp" size="cta-lg">
            <a
              href={waLink(whatsapp, t("whatsappAfterSample"))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="size-5" />
              {common("whatsapp")}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      method="post"
      className="relative rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      data-testid="book-sample-form"
    >
      <Honeypot {...register("website")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={form("fullName")} required error={errors.name?.message}>
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
        <Field label={form("email")} error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("email")}
              type="email"
              dir="ltr"
              autoComplete="email"
              className="h-12 font-latin text-base"
            />
          )}
        </Field>
        <Field
          label={form("qualification")}
          required
          error={errors.qualification?.message}
        >
          {(props) => (
            <select
              {...props}
              {...register("qualification", {
                required: errorText(form, "qualificationRequired"),
              })}
              className={`${selectClass} h-12 text-base`}
            >
              <option value="">{form("qualificationPlaceholder")}</option>
              <option value="MBBS">{form("qualificationMbbs")}</option>
              <option value="INTERN">{form("qualificationIntern")}</option>
              <option value="OTHER">{form("qualificationOther")}</option>
            </select>
          )}
        </Field>
        <Field
          label={t("interestedCourse")}
          error={errors.courseId?.message}
          className="sm:col-span-2"
        >
          {(props) => (
            <select
              {...props}
              {...register("courseId")}
              className={`${selectClass} h-12 text-base`}
            >
              <option value="">{form("selectPlaceholder")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" {...register("consent")} className="mt-1" />
          {t("consent")}
        </label>
      </div>

      <div className="mt-4">
        <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />
      </div>

      <Button
        type="submit"
        variant="accent"
        size="cta-lg"
        disabled={pending}
        className="mt-5 w-full sm:w-auto"
      >
        <Download className="size-5" aria-hidden="true" />
        {pending ? common("submitting") : t("submitSample")}
      </Button>
    </form>
  );
}

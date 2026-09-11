"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { errorText, Field, Honeypot, selectClass } from "@/components/site/forms/field";
import { WhatsAppIcon } from "@/components/site/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitAdmissionApplication } from "@/app/actions/public-forms";
import { waLink } from "@/lib/whatsapp";

export type CourseOption = { id: string; slug: string; label: string };
export type BatchOption = { id: string; label: string };

type FormValues = {
  name: string;
  phone: string;
  whatsapp: string;
  sameWhatsapp: boolean;
  email: string;
  courseId: string;
  qualification: "" | "MBBS" | "INTERN" | "OTHER";
  bmdc: string;
  location: string;
  batchId: string;
  message: string;
  consent: boolean;
  website: string;
};

/** Online admission application (section 5.6). */
export function AdmissionForm({
  courses,
  batches,
  whatsappNumber,
}: {
  courses: CourseOption[];
  batches: BatchOption[];
  whatsappNumber: string;
}) {
  const t = useTranslations("form");
  const apply = useTranslations("apply");
  const common = useTranslations("common");
  const seatsT = useTranslations("seats");
  const searchParams = useSearchParams();

  // /courses/[slug] links here with ?course=slug so the select is pre-filled.
  const preselected = courses.find(
    (course) => course.slug === searchParams.get("course"),
  );

  /**
   * Course pages link here with `waitlist=1` when the batch is full
   * (addendum 2, A1). The office sees these as "[WAITLIST]" enquiries.
   */
  const waitlist = searchParams.get("waitlist") === "1";

  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<{ name: string; course: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      sameWhatsapp: true,
      email: "",
      courseId: preselected?.id ?? "",
      qualification: "",
      bmdc: "",
      location: "",
      batchId: "",
      message: "",
      consent: false,
      website: "",
    },
  });

  const sameWhatsapp = watch("sameWhatsapp");

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await submitAdmissionApplication({
        name: values.name,
        phone: values.phone,
        whatsapp: values.sameWhatsapp ? values.phone : values.whatsapp || undefined,
        email: values.email || undefined,
        courseId: values.courseId,
        qualification: values.qualification || undefined,
        bmdc: values.bmdc || undefined,
        location: values.location || undefined,
        batchId: values.batchId || undefined,
        message: values.message || undefined,
        consent: values.consent,
        waitlist,
        website: values.website,
      });

      if (result.ok) {
        const course = courses.find((option) => option.id === values.courseId);
        setSubmitted({ name: values.name, course: course?.label ?? "" });
        return;
      }

      if (result.errors) {
        for (const [field, key] of Object.entries(result.errors)) {
          setError(field as keyof FormValues, {
            message: errorText(t, key),
          });
        }
        toast.error(errorText(t, "generic"));
        return;
      }

      toast.error(errorText(t, result.error ?? "generic"));
    });
  }

  if (submitted) {
    return (
      <div className="rounded-[14px] border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-6 text-center sm:p-8">
        <CheckCircle2
          className="mx-auto size-12 text-[color:var(--success)]"
          aria-hidden="true"
        />
        <h2 className="mt-3 text-xl font-semibold">{apply("successTitle")}</h2>
        <p className="mt-2 text-[color:var(--muted-foreground)]">
          {apply("successBody")}
        </p>
        <Button asChild variant="whatsapp" size="cta-lg" className="mt-6">
          <a
            href={waLink(
              whatsappNumber,
              apply("whatsappPrefill", {
                name: submitted.name,
                course: submitted.course,
              }),
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="size-5" />
            {apply("successWhatsapp")}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="relative space-y-5 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <Honeypot {...register("website")} />

      {waitlist && (
        <p className="rounded-lg border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-3 text-sm text-[color:var(--warning-ink)]">
          {seatsT("waitlistNote")}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("fullName")}
          required
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          {(props) => (
            <Input
              {...props}
              {...register("name", { required: errorText(t, "nameRequired") })}
              placeholder={t("fullNamePlaceholder")}
              autoComplete="name"
              className="h-11"
            />
          )}
        </Field>

        <Field label={t("phone")} required error={errors.phone?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("phone", { required: errorText(t, "phoneRequired") })}
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder={t("phonePlaceholder")}
              autoComplete="tel"
              className="h-11 font-latin"
            />
          )}
        </Field>

        <Field label={t("email")} error={errors.email?.message} hint={t("optional")}>
          {(props) => (
            <Input
              {...props}
              {...register("email")}
              type="email"
              dir="ltr"
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              className="h-11 font-latin"
            />
          )}
        </Field>

        <div className="sm:col-span-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              {...register("sameWhatsapp")}
              className="size-4 accent-[color:var(--brand)]"
            />
            {t("whatsappSame")}
          </label>
        </div>

        {!sameWhatsapp && (
          <Field
            label={t("whatsapp")}
            error={errors.whatsapp?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <Input
                {...props}
                {...register("whatsapp")}
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder={t("phonePlaceholder")}
                className="h-11 font-latin"
              />
            )}
          </Field>
        )}

        <Field label={t("course")} required error={errors.courseId?.message}>
          {(props) => (
            <select
              {...props}
              {...register("courseId", {
                required: errorText(t, "courseRequired"),
              })}
              className={selectClass}
            >
              <option value="">{t("coursePlaceholder")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label={t("qualification")}
          required
          error={errors.qualification?.message}
        >
          {(props) => (
            <select
              {...props}
              {...register("qualification", {
                required: errorText(t, "qualificationRequired"),
              })}
              className={selectClass}
            >
              <option value="">{t("qualificationPlaceholder")}</option>
              <option value="MBBS">{t("qualificationMbbs")}</option>
              <option value="INTERN">{t("qualificationIntern")}</option>
              <option value="OTHER">{t("qualificationOther")}</option>
            </select>
          )}
        </Field>

        <Field label={t("bmdc")} error={errors.bmdc?.message} hint={t("optional")}>
          {(props) => (
            <Input
              {...props}
              {...register("bmdc")}
              dir="ltr"
              placeholder={t("bmdcPlaceholder")}
              className="h-11 font-latin"
            />
          )}
        </Field>

        <Field label={t("location")} error={errors.location?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("location")}
              placeholder={t("locationPlaceholder")}
              className="h-11"
            />
          )}
        </Field>

        {batches.length > 0 && (
          <Field
            label={t("batch")}
            error={errors.batchId?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <select {...props} {...register("batchId")} className={selectClass}>
                <option value="">{t("batchPlaceholder")}</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field
          label={t("message")}
          error={errors.message?.message}
          className="sm:col-span-2"
        >
          {(props) => (
            <Textarea
              {...props}
              {...register("message")}
              rows={4}
              placeholder={t("messagePlaceholder")}
            />
          )}
        </Field>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            {...register("consent", {
              required: errorText(t, "consentRequired"),
            })}
            aria-invalid={errors.consent ? true : undefined}
            className="mt-1 size-4 shrink-0 accent-[color:var(--brand)]"
          />
          <span>
            {t("consent")}
            <span className="text-[color:var(--accent-red)]" aria-hidden="true">
              {" "}
              *
            </span>
          </span>
        </label>
        {errors.consent && (
          <p className="mt-1 text-xs font-medium text-[color:var(--error)]">
            {errors.consent.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="accent"
        size="cta-lg"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending
          ? common("submitting")
          : waitlist
            ? seatsT("joinWaitlist")
            : t("submitApplication")}
      </Button>
    </form>
  );
}

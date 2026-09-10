"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { errorText, Field, Honeypot, selectClass } from "@/components/site/forms/field";
import { WhatsAppIcon } from "@/components/site/icons";
import type { CourseOption } from "@/components/site/forms/admission-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitFreeClass } from "@/app/actions/public-forms";
import { waLink } from "@/lib/whatsapp";

type FormValues = {
  name: string;
  phone: string;
  courseId: string;
  preferredDate: string;
  message: string;
  website: string;
};

/** Free class booking (section 5.7) — saved as an Application of type FREE_CLASS. */
export function FreeClassForm({
  courses,
  whatsappNumber,
}: {
  courses: CourseOption[];
  whatsappNumber: string;
}) {
  const t = useTranslations("form");
  const freeClass = useTranslations("freeClass");
  const common = useTranslations("common");

  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      courseId: "",
      preferredDate: "",
      message: "",
      website: "",
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await submitFreeClass({
        name: values.name,
        phone: values.phone,
        courseId: values.courseId,
        preferredDate: values.preferredDate || undefined,
        message: values.message || undefined,
        website: values.website,
      });

      if (result.ok) {
        setDone(true);
        return;
      }

      if (result.errors) {
        for (const [field, key] of Object.entries(result.errors)) {
          setError(field as keyof FormValues, { message: errorText(t, key) });
        }
        toast.error(errorText(t, "generic"));
        return;
      }

      toast.error(errorText(t, result.error ?? "generic"));
    });
  }

  if (done) {
    return (
      <div className="rounded-[14px] border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-6 text-center sm:p-8">
        <CheckCircle2
          className="mx-auto size-12 text-[color:var(--success)]"
          aria-hidden="true"
        />
        <h2 className="mt-3 text-xl font-semibold">{freeClass("successTitle")}</h2>
        <p className="mt-2 text-[color:var(--muted-foreground)]">
          {freeClass("successBody")}
        </p>
        <Button asChild variant="whatsapp" size="cta-lg" className="mt-6">
          <a href={waLink(whatsappNumber)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="size-5" />
            {common("whatsapp")}
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

        <Field label={t("courseOfInterest")} required error={errors.courseId?.message}>
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
          label={t("preferredDate")}
          error={errors.preferredDate?.message}
          hint={t("optional")}
          className="sm:col-span-2"
        >
          {(props) => (
            <Input
              {...props}
              {...register("preferredDate")}
              type="date"
              dir="ltr"
              className="h-11 font-latin"
            />
          )}
        </Field>

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

      <Button
        type="submit"
        variant="accent"
        size="cta-lg"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? common("submitting") : t("submitFreeClass")}
      </Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { errorText, Field, Honeypot } from "@/components/site/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "@/app/actions/public-forms";

type FormValues = {
  name: string;
  phone: string;
  email: string;
  message: string;
  website: string;
};

/** Contact form (section 5.16) — saved as an Application of type CONTACT. */
export function ContactForm() {
  const t = useTranslations("form");
  const contact = useTranslations("contact");
  const common = useTranslations("common");

  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", message: "", website: "" },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await submitContactMessage({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        message: values.message,
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
      <div className="rounded-[14px] border border-[color:var(--success)]/30 bg-[color:var(--success)]/8 p-6 text-center">
        <CheckCircle2
          className="mx-auto size-10 text-[color:var(--success)]"
          aria-hidden="true"
        />
        <h3 className="mt-3 text-lg font-semibold">{contact("successTitle")}</h3>
        <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">
          {contact("successBody")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      // Before hydration a native submit would otherwise be a GET, putting the
      // applicant's phone number in the URL.
      method="post"
      className="relative space-y-5 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <Honeypot {...register("website")} />

      <Field label={t("fullName")} required error={errors.name?.message}>
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

      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>

      <Field label={t("message")} required error={errors.message?.message}>
        {(props) => (
          <Textarea
            {...props}
            {...register("message", {
              required: errorText(t, "messageRequired"),
            })}
            rows={5}
            placeholder={t("messagePlaceholder")}
          />
        )}
      </Field>

      <Button
        type="submit"
        variant="brand"
        size="cta-lg"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? common("submitting") : t("submitContact")}
      </Button>
    </form>
  );
}

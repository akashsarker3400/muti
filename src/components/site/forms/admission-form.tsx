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
import { EXAMS, type Exam } from "@/lib/validation";
import { waLink } from "@/lib/whatsapp";

export type CourseOption = { id: string; slug: string; label: string };
export type BatchOption = { id: string; label: string };

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const RELIGIONS = ["islam", "hinduism", "buddhism", "christianity", "other"] as const;

type EducationRow = { exam: Exam; year: string; gpa: string; board: string };

type FormValues = {
  name: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  religion: string;
  bloodGroup: string;
  nationalId: string;
  employment: "" | "GOVT" | "PRIVATE" | "OTHER";
  phone: string;
  whatsapp: string;
  sameWhatsapp: boolean;
  email: string;
  presentAddress: string;
  permanentAddress: string;
  sameAddress: boolean;
  courseId: string;
  qualification: "" | "MBBS" | "INTERN" | "OTHER";
  medicalCollege: string;
  bmdc: string;
  education: EducationRow[];
  location: string;
  batchId: string;
  message: string;
  consent: boolean;
  website: string;
};

/**
 * Online admission application (section 5.6). It mirrors the institute's
 * paper admission form section by section — personal details, contact,
 * education, course — so a completed online form leaves nothing for the
 * office to chase. Only the fields needed to call the applicant back are
 * required; everything else can be completed at admission.
 */
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
      fatherName: "",
      motherName: "",
      dateOfBirth: "",
      religion: "",
      bloodGroup: "",
      nationalId: "",
      employment: "",
      phone: "",
      whatsapp: "",
      sameWhatsapp: true,
      email: "",
      presentAddress: "",
      permanentAddress: "",
      sameAddress: true,
      courseId: preselected?.id ?? "",
      qualification: "",
      medicalCollege: "",
      bmdc: "",
      education: EXAMS.map((exam) => ({ exam, year: "", gpa: "", board: "" })),
      location: "",
      batchId: "",
      message: "",
      consent: false,
      website: "",
    },
  });

  const sameWhatsapp = watch("sameWhatsapp");
  const sameAddress = watch("sameAddress");

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await submitAdmissionApplication({
        name: values.name,
        phone: values.phone,
        whatsapp: values.sameWhatsapp ? values.phone : values.whatsapp || undefined,
        email: values.email || undefined,
        courseId: values.courseId,
        qualification: values.qualification || undefined,
        medicalCollege: values.medicalCollege || undefined,
        bmdc: values.bmdc || undefined,
        location: values.location || undefined,
        batchId: values.batchId || undefined,
        message: values.message || undefined,
        fatherName: values.fatherName || undefined,
        motherName: values.motherName || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        religion: values.religion || undefined,
        nationalId: values.nationalId || undefined,
        bloodGroup: values.bloodGroup || undefined,
        employment: values.employment || undefined,
        presentAddress: values.presentAddress || undefined,
        permanentAddress: values.sameAddress
          ? values.presentAddress || undefined
          : values.permanentAddress || undefined,
        education: values.education,
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
          // "education.2.year" -> the row's input; anything else maps 1:1.
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
      // Before hydration a native submit would otherwise be a GET, putting the
      // applicant's phone number in the URL.
      method="post"
      className="relative space-y-8 rounded-[14px] border border-[color:var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <Honeypot {...register("website")} />

      {waitlist && (
        <p className="rounded-lg border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-3 text-sm text-[color:var(--warning-ink)]">
          {seatsT("waitlistNote")}
        </p>
      )}

      {/* ---- 1. Personal ------------------------------------------------ */}
      <FormSection title={t("sectionPersonal")}>
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

        <Field label={t("fatherName")} error={errors.fatherName?.message}>
          {(props) => <Input {...props} {...register("fatherName")} className="h-11" />}
        </Field>

        <Field label={t("motherName")} error={errors.motherName?.message}>
          {(props) => <Input {...props} {...register("motherName")} className="h-11" />}
        </Field>

        <Field label={t("dateOfBirth")} error={errors.dateOfBirth?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("dateOfBirth")}
              type="date"
              dir="ltr"
              autoComplete="bday"
              className="h-11 font-latin"
            />
          )}
        </Field>

        <Field label={t("religion")} error={errors.religion?.message}>
          {(props) => (
            <select {...props} {...register("religion")} className={selectClass}>
              <option value="">{t("selectPlaceholder")}</option>
              {RELIGIONS.map((key) => (
                <option key={key} value={t(`religionOptions.${key}`)}>
                  {t(`religionOptions.${key}`)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t("bloodGroup")} error={errors.bloodGroup?.message}>
          {(props) => (
            <select
              {...props}
              {...register("bloodGroup")}
              className={`${selectClass} font-latin`}
            >
              <option value="">{t("selectPlaceholder")}</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t("employment")} error={errors.employment?.message}>
          {(props) => (
            <select {...props} {...register("employment")} className={selectClass}>
              <option value="">{t("selectPlaceholder")}</option>
              <option value="GOVT">{t("employmentGovt")}</option>
              <option value="PRIVATE">{t("employmentPrivate")}</option>
              <option value="OTHER">{t("employmentOther")}</option>
            </select>
          )}
        </Field>

        <Field
          label={t("nationalId")}
          error={errors.nationalId?.message}
          hint={t("nationalIdHint")}
          className="sm:col-span-2"
        >
          {(props) => (
            <Input
              {...props}
              {...register("nationalId")}
              inputMode="numeric"
              dir="ltr"
              placeholder={t("nationalIdPlaceholder")}
              className="h-11 font-latin"
            />
          )}
        </Field>
      </FormSection>

      {/* ---- 2. Contact ------------------------------------------------- */}
      <FormSection title={t("sectionContact")}>
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

        <Field
          label={t("presentAddress")}
          error={errors.presentAddress?.message}
          className="sm:col-span-2"
        >
          {(props) => (
            <Textarea
              {...props}
              {...register("presentAddress")}
              rows={2}
              autoComplete="street-address"
              placeholder={t("addressPlaceholder")}
            />
          )}
        </Field>

        <div className="sm:col-span-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              {...register("sameAddress")}
              className="size-4 accent-[color:var(--brand)]"
            />
            {t("addressSame")}
          </label>
        </div>

        {!sameAddress && (
          <Field
            label={t("permanentAddress")}
            error={errors.permanentAddress?.message}
            className="sm:col-span-2"
          >
            {(props) => (
              <Textarea
                {...props}
                {...register("permanentAddress")}
                rows={2}
                placeholder={t("addressPlaceholder")}
              />
            )}
          </Field>
        )}
      </FormSection>

      {/* ---- 3. Education ----------------------------------------------- */}
      <FormSection title={t("sectionEducation")}>
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

        <Field label={t("medicalCollege")} error={errors.medicalCollege?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("medicalCollege")}
              placeholder={t("medicalCollegePlaceholder")}
              className="h-11"
            />
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

        {/*
          The paper form's exam table: one row per exam with passing year,
          GPA and board/university. On phones each row stacks into a card.
        */}
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">{t("educationTable")}</legend>
          <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
            <div className="hidden grid-cols-[7rem_1fr_1fr_2fr] gap-2 border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--muted-foreground)] sm:grid">
              <span>{t("exam")}</span>
              <span>{t("passingYear")}</span>
              <span>{t("gpa")}</span>
              <span>{t("board")}</span>
            </div>
            {EXAMS.map((exam, index) => {
              const rowErrors = errors.education?.[index];
              return (
                <div
                  key={exam}
                  className="grid gap-2 border-b border-[color:var(--border)] px-3 py-3 last:border-b-0 sm:grid-cols-[7rem_1fr_1fr_2fr] sm:items-center sm:py-2"
                >
                  <span className="font-latin text-sm font-semibold">
                    {t(`examOptions.${exam}`)}
                  </span>
                  <Input
                    {...register(`education.${index}.year` as const)}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder={t("passingYear")}
                    aria-label={`${t(`examOptions.${exam}`)} — ${t("passingYear")}`}
                    aria-invalid={rowErrors?.year ? true : undefined}
                    className="h-10 font-latin"
                  />
                  <Input
                    {...register(`education.${index}.gpa` as const)}
                    dir="ltr"
                    placeholder={t("gpa")}
                    aria-label={`${t(`examOptions.${exam}`)} — ${t("gpa")}`}
                    className="h-10 font-latin"
                  />
                  <Input
                    {...register(`education.${index}.board` as const)}
                    placeholder={t("board")}
                    aria-label={`${t(`examOptions.${exam}`)} — ${t("board")}`}
                    className="h-10"
                  />
                  {rowErrors?.year && (
                    <p className="text-xs font-medium text-[color:var(--error)] sm:col-span-4">
                      {rowErrors.year.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      </FormSection>

      {/* ---- 4. Course -------------------------------------------------- */}
      <FormSection title={t("sectionCourse")}>
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

        {batches.length > 0 && (
          <Field label={t("batch")} error={errors.batchId?.message}>
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
          label={t("location")}
          error={errors.location?.message}
          className="sm:col-span-2"
        >
          {(props) => (
            <Input
              {...props}
              {...register("location")}
              placeholder={t("locationPlaceholder")}
              className="h-11"
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
              rows={3}
              placeholder={t("messagePlaceholder")}
            />
          )}
        </Field>
      </FormSection>

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

/** A titled group of fields, laid out two-up on wider screens. */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 text-base font-semibold text-[color:var(--brand)]">
        {title}
        <span className="h-px flex-1 bg-[color:var(--border)]" aria-hidden="true" />
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

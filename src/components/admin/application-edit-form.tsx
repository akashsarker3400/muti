"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { updateApplication } from "@/app/actions/admin-applications";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EDUCATION_EXAMS } from "@/lib/admin/application-edit";
import { cn } from "cn";

type EducationRow = { exam: string; year: string; gpa: string; board: string };

export type ApplicationEditValues = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  courseId: string;
  batchId: string;
  qualification: string;
  medicalCollege: string;
  bmdc: string;
  location: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  religion: string;
  nationalId: string;
  bloodGroup: string;
  employment: string;
  presentAddress: string;
  permanentAddress: string;
  education: EducationRow[];
  message: string;
};

type TextField = Exclude<keyof ApplicationEditValues, "education">;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const QUALIFICATIONS = ["MBBS", "Intern doctor", "Other"];
const EXAM_LABELS: Record<string, string> = {
  SSC: "SSC",
  HSC: "HSC",
  MBBS: "MBBS",
  OTHER: "Other",
};

const selectClass =
  "h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/** The super admin's correction form for one application. */
export function ApplicationEditForm({
  id,
  initial,
  courses,
  batches,
  student,
}: {
  id: string;
  initial: ApplicationEditValues;
  courses: Array<{ id: string; label: string }>;
  batches: Array<{ id: string; name: string; courseId: string; status: string }>;
  student: { id: string; roll: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [syncStudent, setSyncStudent] = useState(true);

  // One row per exam, in the public form's order, whatever was stored.
  const [education, setEducation] = useState<EducationRow[]>(() =>
    EDUCATION_EXAMS.map(
      (exam) =>
        initial.education.find((row) => row.exam === exam) ?? {
          exam,
          year: "",
          gpa: "",
          board: "",
        },
    ),
  );

  const courseBatches = useMemo(
    () => batches.filter((batch) => batch.courseId === values.courseId),
    [batches, values.courseId],
  );

  const set = (key: TextField, value: string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      // A batch of the old course cannot stay selected under a new one.
      if (key === "courseId" && current.courseId !== value) next.batchId = "";
      return next;
    });
  };

  const setRow = (index: number, key: keyof EducationRow, value: string) =>
    setEducation((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateApplication(
        id,
        {
          ...values,
          employment: values.employment as "" | "GOVT" | "PRIVATE" | "OTHER",
          education: education as Array<EducationRow & { exam: "SSC" }>,
        },
        { syncStudent: Boolean(student) && syncStudent },
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Could not save.");
        return;
      }
      setErrors({});
      if (result.changed === 0) {
        toast.info("Nothing was changed.");
        return;
      }
      toast.success(
        `Saved ${result.changed} change${result.changed === 1 ? "" : "s"}` +
          (result.studentUpdated ? ", student record updated too." : "."),
      );
      router.refresh();
    });
  }

  const field = (
    key: TextField,
    label: string,
    options: {
      wide?: boolean;
      type?: string;
      latin?: boolean;
      textarea?: boolean;
      required?: boolean;
    } = {},
  ) => (
    <div className={cn("space-y-1.5", options.wide && "sm:col-span-2")}>
      <Label htmlFor={`app-${key}`}>
        {label}
        {options.required && <span className="text-[color:var(--error)]"> *</span>}
      </Label>
      {options.textarea ? (
        <Textarea
          id={`app-${key}`}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          rows={3}
          aria-invalid={Boolean(errors[key])}
        />
      ) : (
        <Input
          id={`app-${key}`}
          type={options.type ?? "text"}
          value={values[key]}
          onChange={(event) => set(key, event.target.value)}
          className={cn("h-11", options.latin && "font-latin")}
          aria-invalid={Boolean(errors[key])}
        />
      )}
      {errors[key] && (
        <p className="text-sm text-[color:var(--error)]">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      {student && (
        <Panel className="border-amber-300 bg-amber-50">
          <p className="text-sm">
            This applicant is already a student (roll{" "}
            <Link
              href={`/admin/students/${student.id}`}
              className="font-latin underline"
            >
              {student.roll}
            </Link>
            ). The student record is separate from this application.
          </p>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={syncStudent}
              onChange={(event) => setSyncStudent(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              Also correct the student record: name, mobile, email, date of birth,
              parents&rsquo; names, NID, BMDC, blood group and address, only the ones
              changed here. Course and batch are never copied, because they carry the
              roll number and the fee plan.
            </span>
          </label>
        </Panel>
      )}

      <Panel>
        <h2 className="mb-4 text-base font-semibold">Course</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="app-courseId">Course</Label>
            <select
              id="app-courseId"
              value={values.courseId}
              onChange={(event) => set("courseId", event.target.value)}
              className={selectClass}
            >
              <option value="">No course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-batchId">Batch</Label>
            <select
              id="app-batchId"
              value={values.batchId}
              onChange={(event) => set("batchId", event.target.value)}
              className={selectClass}
              aria-invalid={Boolean(errors.batchId)}
            >
              <option value="">No batch</option>
              {courseBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                  {batch.status === "COMPLETED" ? " (completed)" : ""}
                </option>
              ))}
            </select>
            {errors.batchId && (
              <p className="text-sm text-[color:var(--error)]">{errors.batchId}</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-base font-semibold">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Full name", { wide: true, required: true })}
          {field("fatherName", "Father's name")}
          {field("motherName", "Mother's name")}
          {field("dateOfBirth", "Date of birth", { type: "date", latin: true })}
          {field("religion", "Religion")}
          <div className="space-y-1.5">
            <Label htmlFor="app-bloodGroup">Blood group</Label>
            <select
              id="app-bloodGroup"
              value={values.bloodGroup}
              onChange={(event) => set("bloodGroup", event.target.value)}
              className={selectClass}
            >
              <option value="">Not given</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-employment">Employment</Label>
            <select
              id="app-employment"
              value={values.employment}
              onChange={(event) => set("employment", event.target.value)}
              className={selectClass}
            >
              <option value="">Not given</option>
              <option value="GOVT">Government</option>
              <option value="PRIVATE">Private</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          {field("nationalId", "National ID", { latin: true })}
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-base font-semibold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("phone", "Mobile", { type: "tel", latin: true, required: true })}
          {field("whatsapp", "WhatsApp", { type: "tel", latin: true })}
          {field("email", "Email", { type: "email", latin: true, wide: true })}
          {field("presentAddress", "Present address", { wide: true, textarea: true })}
          {field("permanentAddress", "Permanent address", {
            wide: true,
            textarea: true,
          })}
          {field("location", "Location", { wide: true })}
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-4 text-base font-semibold">Qualification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="app-qualification">Qualification</Label>
            <select
              id="app-qualification"
              value={values.qualification}
              onChange={(event) => set("qualification", event.target.value)}
              className={selectClass}
            >
              <option value="">Not given</option>
              {[
                ...QUALIFICATIONS,
                ...(values.qualification &&
                !QUALIFICATIONS.includes(values.qualification)
                  ? [values.qualification]
                  : []),
              ].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          {field("bmdc", "BMDC registration", { latin: true })}
          {field("medicalCollege", "Medical college", { wide: true })}
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold">Academic record</h3>
        <div className="space-y-3">
          {education.map((row, index) => (
            <div
              key={row.exam}
              className="grid grid-cols-2 gap-2 sm:grid-cols-[80px_1fr_1fr_2fr] sm:items-center"
            >
              <span className="col-span-2 text-sm font-medium sm:col-span-1">
                {EXAM_LABELS[row.exam] ?? row.exam}
              </span>
              <Input
                aria-label={`${row.exam} year`}
                placeholder="Year"
                value={row.year}
                onChange={(event) => setRow(index, "year", event.target.value)}
                className="h-11 font-latin"
                aria-invalid={Boolean(errors[`education.${index}.year`])}
              />
              <Input
                aria-label={`${row.exam} GPA / result`}
                placeholder="GPA / result"
                value={row.gpa}
                onChange={(event) => setRow(index, "gpa", event.target.value)}
                className="h-11 font-latin"
              />
              <Input
                aria-label={`${row.exam} board / university`}
                placeholder="Board / university"
                value={row.board}
                onChange={(event) => setRow(index, "board", event.target.value)}
                className="col-span-2 h-11 sm:col-span-1"
              />
              {errors[`education.${index}.year`] && (
                <p className="col-span-2 text-sm text-[color:var(--error)] sm:col-span-4">
                  {errors[`education.${index}.year`]}
                </p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>{field("message", "Applicant's message", { textarea: true })}</Panel>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-[color:var(--border)] bg-white/95 px-4 py-3 backdrop-blur">
        <Button type="submit" variant="brand" size="cta" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}

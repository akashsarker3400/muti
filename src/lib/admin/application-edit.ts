import { z } from "zod";

import { normalizePhone } from "@/lib/phone";
import { admissionApplicationSchema, EXAMS } from "@/lib/validation";

/**
 * Correcting an application after it was sent: an applicant who notices a
 * typo in their name, a wrong phone number or the wrong course calls the
 * office, and a super admin fixes it here. The rules are the public form's
 * own (same limits, same phone and NID checks), except that the course is
 * optional, because a free-class or contact enquiry may not have one, and
 * the qualification is free text, because the form stores its label.
 *
 * Kept free of server-only imports so it is unit tested without a database.
 */
export const applicationEditSchema = admissionApplicationSchema
  .pick({
    name: true,
    phone: true,
    whatsapp: true,
    email: true,
    medicalCollege: true,
    bmdc: true,
    location: true,
    fatherName: true,
    motherName: true,
    dateOfBirth: true,
    religion: true,
    nationalId: true,
    bloodGroup: true,
    employment: true,
    presentAddress: true,
    permanentAddress: true,
    education: true,
    message: true,
  })
  .extend({
    courseId: z.string().trim().optional(),
    batchId: z.string().trim().optional(),
    qualification: z.string().trim().max(60).optional(),
  });

export type ApplicationEditInput = z.input<typeof applicationEditSchema>;

/** The form's message keys, in the admin's language. */
export const EDIT_ERROR_TEXT: Record<string, string> = {
  nameRequired: "Name is required.",
  nameTooShort: "Name must be at least 3 characters.",
  phoneRequired: "Mobile number is required.",
  phoneInvalid: "Not a valid Bangladeshi mobile number.",
  emailInvalid: "Not a valid email address.",
  nidInvalid: "A National ID has 10, 13 or 17 digits.",
  dateInvalid: "Not a valid date of birth.",
  yearInvalid: "Year must be four digits, e.g. 2019.",
};

export const EDUCATION_EXAMS = EXAMS;

type EducationRow = { exam: string; year: string; gpa: string; board: string };

/** The columns a correction writes, in the shape Prisma stores them. */
export type ApplicationValues = {
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  courseId: string | null;
  batchId: string | null;
  qualification: string | null;
  medicalCollege: string | null;
  bmdc: string | null;
  location: string | null;
  fatherName: string | null;
  motherName: string | null;
  dateOfBirth: Date | null;
  religion: string | null;
  nationalId: string | null;
  bloodGroup: string | null;
  employment: "GOVT" | "PRIVATE" | "OTHER" | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  education: EducationRow[] | null;
  message: string | null;
};

type Parsed = z.output<typeof applicationEditSchema>;

/** Validated input to column values: blanks become null, phones normalised. */
export function toApplicationValues(data: Parsed): ApplicationValues {
  const blank = (value: string | undefined) => value || null;
  return {
    name: data.name,
    phone: normalizePhone(data.phone)!,
    whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : null,
    email: blank(data.email),
    courseId: blank(data.courseId),
    batchId: blank(data.batchId),
    qualification: blank(data.qualification),
    medicalCollege: blank(data.medicalCollege),
    bmdc: blank(data.bmdc),
    location: blank(data.location),
    fatherName: blank(data.fatherName),
    motherName: blank(data.motherName),
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    religion: blank(data.religion),
    nationalId: blank(data.nationalId),
    bloodGroup: blank(data.bloodGroup),
    employment: data.employment || null,
    presentAddress: blank(data.presentAddress),
    permanentAddress: blank(data.permanentAddress),
    education: data.education && data.education.length > 0 ? data.education : null,
    message: blank(data.message),
  };
}

function comparable(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export type FieldChange = { from: string | null; to: string | null };

/**
 * What a correction actually changed, for the activity log: only the fields
 * whose value differs, each with its old and new value as text. An empty
 * result means the save changed nothing.
 */
export function diffApplication(
  before: Partial<Record<keyof ApplicationValues, unknown>>,
  after: ApplicationValues,
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const key of Object.keys(after) as Array<keyof ApplicationValues>) {
    const from = comparable(before[key]);
    const to = comparable(after[key]);
    if (from !== to) changes[key] = { from, to };
  }
  return changes;
}

import { z } from "zod";

import { isValidPhone } from "@/lib/phone";

/**
 * Server-side validation for every public form (section 11). The messages are
 * message-catalogue keys, not sentences, so the client can render them in the
 * visitor's language.
 */

const name = z.string().trim().min(1, "nameRequired").min(3, "nameTooShort").max(120);

const phone = z
  .string()
  .trim()
  .min(1, "phoneRequired")
  .refine(isValidPhone, "phoneInvalid");

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .refine((value) => !value || isValidPhone(value), "phoneInvalid");

const email = z
  .string()
  .trim()
  .max(160)
  .optional()
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "emailInvalid",
  );

/** Bots fill hidden inputs; humans leave them empty (section 5.6). */
const honeypot = z.string().max(0).optional().or(z.literal(""));

export const EXAMS = ["SSC", "HSC", "MBBS", "OTHER"] as const;
export type Exam = (typeof EXAMS)[number];

const educationRow = z.object({
  exam: z.enum(EXAMS),
  year: z
    .string()
    .trim()
    .max(4)
    .refine((value) => !value || /^(19|20)\d{2}$/.test(value), "yearInvalid"),
  gpa: z.string().trim().max(12),
  board: z.string().trim().max(120),
});

/** A row is kept only when the applicant typed something into it. */
const education = z
  .array(educationRow)
  .max(EXAMS.length)
  .transform((rows) => rows.filter((row) => row.year || row.gpa || row.board))
  .optional();

/** Bangladeshi NID numbers are 10, 13 or 17 digits. */
const nationalId = z
  .string()
  .trim()
  .max(20)
  .refine((value) => !value || /^\d{10}$|^\d{13}$|^\d{17}$/.test(value), "nidInvalid")
  .optional();

const dateOfBirth = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date < new Date();
  }, "dateInvalid")
  .optional();

export const admissionApplicationSchema = z.object({
  name,
  phone,
  whatsapp: optionalPhone,
  email,
  courseId: z.string().trim().min(1, "courseRequired"),
  qualification: z.enum(["MBBS", "INTERN", "OTHER"], {
    message: "qualificationRequired",
  }),
  medicalCollege: z.string().trim().max(160).optional(),
  bmdc: z.string().trim().max(60).optional(),
  location: z.string().trim().max(160).optional(),
  batchId: z.string().trim().optional(),
  fatherName: z.string().trim().max(120).optional(),
  motherName: z.string().trim().max(120).optional(),
  dateOfBirth,
  religion: z.string().trim().max(40).optional(),
  nationalId,
  bloodGroup: z.string().trim().max(3).optional(),
  employment: z.enum(["GOVT", "PRIVATE", "OTHER"]).or(z.literal("")).optional(),
  presentAddress: z.string().trim().max(500).optional(),
  permanentAddress: z.string().trim().max(500).optional(),
  education,
  message: z.string().trim().max(2000).optional(),
  consent: z.literal(true, { message: "consentRequired" }),
  /** Set when the chosen batch is full (addendum 2, A1). */
  waitlist: z.boolean().optional(),
  website: honeypot,
});

export const freeClassSchema = z.object({
  name,
  phone,
  courseId: z.string().trim().min(1, "courseRequired"),
  preferredDate: z.string().trim().max(30).optional(),
  message: z.string().trim().max(2000).optional(),
  website: honeypot,
});

export const contactSchema = z.object({
  name,
  phone,
  email,
  message: z.string().trim().min(1, "messageRequired").max(2000),
  website: honeypot,
});

/** Free sample chapter of the course book (addendum 5, A4). */
export const bookSampleSchema = z.object({
  name,
  phone,
  email,
  qualification: z.enum(["MBBS", "INTERN", "OTHER"], {
    message: "qualificationRequired",
  }),
  courseId: z.string().trim().optional(),
  consent: z.boolean().optional(),
  turnstileToken: z.string().optional(),
  website: honeypot,
});

export const verifySchema = z.object({
  query: z.string().trim().min(3, "queryRequired").max(60),
});

export type AdmissionApplicationInput = z.infer<typeof admissionApplicationSchema>;
export type FreeClassInput = z.infer<typeof freeClassSchema>;
export type ContactInput = z.infer<typeof contactSchema>;

/** Collapses a ZodError into `{ fieldName: messageKey }` for the form UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

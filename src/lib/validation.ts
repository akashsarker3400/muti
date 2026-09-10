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

export const admissionApplicationSchema = z.object({
  name,
  phone,
  whatsapp: optionalPhone,
  email,
  courseId: z.string().trim().min(1, "courseRequired"),
  qualification: z.enum(["MBBS", "INTERN", "OTHER"], {
    message: "qualificationRequired",
  }),
  bmdc: z.string().trim().max(60).optional(),
  location: z.string().trim().max(160).optional(),
  batchId: z.string().trim().optional(),
  message: z.string().trim().max(2000).optional(),
  consent: z.literal(true, { message: "consentRequired" }),
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

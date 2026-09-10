"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifySchema } from "@/lib/validation";

/**
 * Public certificate verification (section 5.12). Only students explicitly
 * marked `verifiable` in the admin panel are exposed, the name is masked, and
 * the endpoint is rate limited so the table cannot be enumerated.
 */

export type VerifyResult =
  | {
      status: "valid";
      name: string;
      course: string;
      batch: string | null;
      completionDate: string | null;
      grade: string | null;
    }
  | { status: "not-found" }
  | { status: "rate-limited" }
  | { status: "invalid" };

export async function verifyCertificate(query: string): Promise<VerifyResult> {
  const parsed = verifySchema.safeParse({ query });
  if (!parsed.success) return { status: "invalid" };

  const limit = await checkRateLimit("verify");
  if (!limit.allowed) return { status: "rate-limited" };

  const value = parsed.data.query;

  const student = await prisma.student.findFirst({
    where: {
      verifiable: true,
      OR: [
        { certificateNo: { equals: value, mode: "insensitive" } },
        { roll: { equals: value, mode: "insensitive" } },
      ],
    },
    include: { course: true, batch: true },
  });

  if (!student) return { status: "not-found" };

  return {
    status: "valid",
    name: maskName(student.name),
    course: student.course.fullNameEn,
    batch: student.batch?.name ?? null,
    completionDate: student.completionDate
      ? student.completionDate.toISOString()
      : null,
    grade: student.resultGrade,
  };
}

/**
 * Masks the middle of each name part so the result confirms an identity
 * someone already holds without publishing the full name:
 * "Rahim Uddin Ahmed" -> "Ra*** Ud*** Ah***".
 */
function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 2) return part;
      return `${part.slice(0, 2)}${"*".repeat(Math.min(part.length - 2, 4))}`;
    })
    .join(" ");
}

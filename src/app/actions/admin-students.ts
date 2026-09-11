"use server";

import { revalidatePath } from "next/cache";

import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { parseCsv, parseImportDate } from "@/lib/admin/csv";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * CSV import for students (section 7.5).
 * Expected columns: roll, certificateNo, name, phone, courseCode, batchName,
 * completionDate. Rows are matched on `roll`, so re-importing a corrected file
 * updates the existing students instead of duplicating them.
 */

export type ImportResult = {
  ok: boolean;
  created?: number;
  updated?: number;
  skipped?: Array<{ line: number; reason: string }>;
  error?: string;
};

export async function importStudents(csv: string): Promise<ImportResult> {
  const admin = await requireAdmin();

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return { ok: false, error: "ফাইলে কোনো ডেটা পাওয়া যায়নি।" };
  }

  const header = rows[0]!.map((cell) => cell.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name.toLowerCase());

  const columns = {
    roll: index("roll"),
    certificateNo: index("certificateNo"),
    name: index("name"),
    phone: index("phone"),
    courseCode: index("courseCode"),
    batchName: index("batchName"),
    completionDate: index("completionDate"),
  };

  if (columns.roll === -1 || columns.name === -1 || columns.courseCode === -1) {
    return {
      ok: false,
      error: "হেডার সারিতে অন্তত roll, name ও courseCode কলাম থাকতে হবে।",
    };
  }

  const [courses, batches] = await Promise.all([
    prisma.course.findMany({ select: { id: true, code: true } }),
    prisma.batch.findMany({ select: { id: true, name: true } }),
  ]);

  const courseByCode = new Map(
    courses.map((course) => [course.code.toLowerCase(), course.id]),
  );
  const batchByName = new Map(
    batches.map((batch) => [batch.name.toLowerCase(), batch.id]),
  );

  const skipped: Array<{ line: number; reason: string }> = [];
  let created = 0;
  let updated = 0;

  for (const [offset, row] of rows.slice(1).entries()) {
    const line = offset + 2;
    const cell = (position: number) =>
      position === -1 ? "" : (row[position] ?? "").trim();

    const roll = cell(columns.roll);
    const name = cell(columns.name);
    const courseCode = cell(columns.courseCode);

    if (!roll && !name) continue; // blank line
    if (!roll) {
      skipped.push({ line, reason: "roll ফাঁকা" });
      continue;
    }
    if (!name) {
      skipped.push({ line, reason: "name ফাঁকা" });
      continue;
    }

    const courseId = courseByCode.get(courseCode.toLowerCase());
    if (!courseId) {
      skipped.push({ line, reason: `courseCode "${courseCode}" পাওয়া যায়নি` });
      continue;
    }

    const batchName = cell(columns.batchName);
    const batchId = batchName
      ? (batchByName.get(batchName.toLowerCase()) ?? null)
      : null;
    if (batchName && !batchId) {
      skipped.push({ line, reason: `batchName "${batchName}" পাওয়া যায়নি` });
      continue;
    }

    const phoneRaw = cell(columns.phone);
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    const completionRaw = cell(columns.completionDate);
    const completionDate = completionRaw ? parseImportDate(completionRaw) : null;
    if (completionRaw && !completionDate) {
      skipped.push({ line, reason: `completionDate "${completionRaw}" পড়া যায়নি` });
      continue;
    }

    const certificateNo = cell(columns.certificateNo) || null;

    try {
      const existing = await prisma.student.findUnique({ where: { roll } });

      const data = {
        name,
        phone,
        courseId,
        batchId,
        certificateNo,
        completionDate,
        // A completion date means the course is finished and the certificate
        // can be verified publicly.
        ...(completionDate ? { status: "COMPLETED" as const, verifiable: true } : {}),
      };

      if (existing) {
        await prisma.student.update({ where: { roll }, data });
        updated += 1;
      } else {
        await prisma.student.create({ data: { roll, ...data } });
        created += 1;
      }
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      skipped.push({
        line,
        reason:
          code === "P2002"
            ? "সার্টিফিকেট নম্বরটি অন্য শিক্ষার্থীর কাছে আছে"
            : "সংরক্ষণ করা যায়নি",
      });
    }
  }

  await logActivity(
    admin.id,
    "import-students",
    "student",
    `created:${created} updated:${updated}`,
  );
  revalidatePath("/admin/students");

  return { ok: true, created, updated, skipped };
}

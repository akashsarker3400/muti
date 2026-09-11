"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { parseImportDate } from "@/lib/admin/csv";
import { IMPORT_ENTITIES, MAX_ROWS } from "@/lib/admin/import/entities";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { latinDigits, normalizeBmdc, normalizeRoll } from "@/lib/verify";

/**
 * Bulk import (addendum 3, §3). The client parses the spreadsheet and sends
 * plain rows; this module validates every row, decides create / update /
 * skip against the entity's match key, and writes in chunks of 200 inside a
 * transaction each. Errors are returned per row so the office can download
 * them, fix the sheet and re-upload.
 */

export type DuplicateMode = "skip" | "update";
export type RowIssue = { row: number; message: string };
export type ImportPreview = {
  ok: boolean;
  error?: string;
  total: number;
  valid: number;
  duplicates: number;
  issues: RowIssue[];
};
export type ImportSummary = {
  ok: boolean;
  error?: string;
  jobId?: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  issues: RowIssue[];
};

type Row = Record<string, string>;
type Lookups = {
  courses: Map<string, string>;
  batches: Map<string, string>;
  studentsByRoll: Map<string, { id: string; courseId: string }>;
  studentsByBmdc: Map<string, { id: string; courseId: string }>;
};

const upper = (value: string | undefined) => (value ?? "").trim().toUpperCase();
const optional = (value: string | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
};
const optionalDate = (value: string | undefined) =>
  value?.trim() ? parseImportDate(latinDigits(value)) : null;

async function lookups(): Promise<Lookups> {
  const [courses, batches, students] = await Promise.all([
    prisma.course.findMany({ select: { id: true, code: true } }),
    prisma.batch.findMany({ select: { id: true, name: true } }),
    prisma.student.findMany({
      select: { id: true, roll: true, bmdcNormalized: true, courseId: true },
    }),
  ]);
  return {
    courses: new Map(courses.map((c) => [c.code.toUpperCase(), c.id])),
    batches: new Map(batches.map((b) => [b.name.trim().toLowerCase(), b.id])),
    studentsByRoll: new Map(
      students.map((s) => [s.roll.toUpperCase(), { id: s.id, courseId: s.courseId }]),
    ),
    studentsByBmdc: new Map(
      students
        .filter((s) => s.bmdcNormalized)
        .map((s) => [s.bmdcNormalized!, { id: s.id, courseId: s.courseId }]),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Per-entity validation -> Prisma data                                       */
/* -------------------------------------------------------------------------- */

type Prepared = { key: string; data: Record<string, unknown> };
type Validator = (row: Row, lookups: Lookups, context: string) => Prepared | string;

const studentStatus = z.enum(["ACTIVE", "COMPLETED", "DROPPED"]);

const validators: Record<string, Validator> = {
  students: (row, look) => {
    const roll = latinDigits(row.roll ?? "").trim();
    if (!roll) return "roll is empty";
    if (!row.name?.trim()) return "name is empty";
    const phone = normalizePhone(row.phone ?? "");
    if (!phone) return "phone is not a valid Bangladeshi number";
    const courseId = look.courses.get(upper(row.course_code));
    if (!courseId) return `course_code “${row.course_code ?? ""}” not found`;
    const status = upper(row.status) || "ACTIVE";
    if (!studentStatus.safeParse(status).success)
      return `status “${row.status}” is invalid`;
    const batchId = row.batch_name?.trim()
      ? (look.batches.get(row.batch_name.trim().toLowerCase()) ?? null)
      : null;
    if (row.batch_name?.trim() && !batchId)
      return `batch_name “${row.batch_name}” not found`;
    const gender = upper(row.gender);
    if (gender && !["MALE", "FEMALE", "OTHER"].includes(gender))
      return `gender “${row.gender}” is invalid`;
    const boardRoll = row.board_roll?.trim() ? normalizeRoll(row.board_roll) : null;
    if (boardRoll && boardRoll.length !== 10) return "board_roll must be 10 digits";
    const bmdc = optional(row.bmdc);
    return {
      key: roll.toUpperCase(),
      data: {
        roll,
        name: row.name.trim(),
        nameBn: optional(row.name_bn),
        phone,
        email: optional(row.email)?.toLowerCase() ?? null,
        gender: gender || null,
        dateOfBirth: optionalDate(row.dob),
        fatherName: optional(row.father_name),
        motherName: optional(row.mother_name),
        nid: optional(row.nid) ? latinDigits(row.nid!.trim()) : null,
        bmdc,
        bmdcNormalized: bmdc ? normalizeBmdc(bmdc) : null,
        address: optional(row.address),
        courseId,
        batchId,
        admissionDate: optionalDate(row.admission_date),
        status,
        boardRoll,
        boardRegistrationNo: optional(row.board_registration_no)
          ? normalizeRoll(row.board_registration_no!)
          : null,
      },
    };
  },

  certificates: (row, look) => {
    const certificateNo = latinDigits(row.certificate_no ?? "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!certificateNo) return "certificate_no is empty";
    const student =
      (row.roll?.trim() &&
        look.studentsByRoll.get(latinDigits(row.roll).trim().toUpperCase())) ||
      (row.bmdc?.trim() && look.studentsByBmdc.get(normalizeBmdc(row.bmdc)));
    if (!student) return "no student found by roll or bmdc (import students first)";
    const courseId = row.course_code?.trim()
      ? look.courses.get(upper(row.course_code))
      : student.courseId;
    if (!courseId) return `course_code “${row.course_code}” not found`;
    const type = upper(row.type) || "COURSE";
    if (!["COURSE", "SEMESTER", "BOARD"].includes(type))
      return `type “${row.type}” is invalid`;
    const status = upper(row.status) || "VALID";
    if (!["VALID", "REVOKED"].includes(status))
      return `status “${row.status}” is invalid`;
    return {
      key: certificateNo,
      data: {
        certificateNo,
        studentId: student.id,
        courseId,
        type,
        session: optional(row.session),
        batchName: optional(row.batch_name),
        issuedAt: optionalDate(row.issued_at),
        grade: optional(row.grade),
        status,
        revokedReason: status === "REVOKED" ? optional(row.revoked_reason) : null,
      },
    };
  },

  "board-results": (row, _look, examId) => {
    if (!examId) return "No exam selected";
    const roll = normalizeRoll(row.roll ?? "");
    if (roll.length < 4) return "roll must be numeric";
    const status = upper(row.status);
    if (!["PASS", "FAIL", "WITHHELD", "ABSENT"].includes(status))
      return `status “${row.status}” is invalid`;
    let gpa: number | null = null;
    if (row.gpa?.trim()) {
      gpa = Number(latinDigits(row.gpa));
      if (!Number.isFinite(gpa) || gpa < 0 || gpa > 5)
        return "gpa must be between 0 and 5";
      gpa = Math.round(gpa * 100) / 100;
    }
    return {
      key: roll,
      data: {
        boardExamId: examId,
        roll,
        registrationNo: optional(row.registration_no)
          ? normalizeRoll(row.registration_no!)
          : null,
        studentName: optional(row.student_name),
        status,
        gpa,
        failedSubjects: optional(row.failed_subjects),
        remark: optional(row.remark),
      },
    };
  },

  advisors: (row) => {
    if (!row.name?.trim()) return "name is empty";
    if (!row.designation?.trim()) return "designation is empty";
    const sortOrder = row.sort_order?.trim() ? Number(latinDigits(row.sort_order)) : 0;
    if (!Number.isFinite(sortOrder)) return "sort_order must be a number";
    return {
      key: row.name.trim().toLowerCase(),
      data: {
        name: row.name.trim(),
        nameBn: optional(row.name_bn),
        degrees: optional(row.degrees),
        designation: row.designation.trim(),
        designationBn: optional(row.designation_bn),
        organization: optional(row.organization),
        category: upper(row.category) || "ADVISOR",
        photo: optional(row.photo_url),
        bio: optional(row.bio),
        sortOrder: Math.trunc(sortOrder),
        published: true,
      },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Existing keys per entity, for duplicate handling                           */
/* -------------------------------------------------------------------------- */

async function existingKeys(
  entity: string,
  keys: string[],
  context: string,
): Promise<Map<string, string>> {
  switch (entity) {
    case "students": {
      const rows = await prisma.student.findMany({
        where: { roll: { in: keys, mode: "insensitive" } },
        select: { id: true, roll: true },
      });
      return new Map(rows.map((r) => [r.roll.toUpperCase(), r.id]));
    }
    case "certificates": {
      const rows = await prisma.certificate.findMany({
        where: { certificateNo: { in: keys } },
        select: { id: true, certificateNo: true },
      });
      return new Map(rows.map((r) => [r.certificateNo, r.id]));
    }
    case "board-results": {
      const rows = await prisma.boardResult.findMany({
        where: { boardExamId: context, roll: { in: keys } },
        select: { id: true, roll: true },
      });
      return new Map(rows.map((r) => [r.roll, r.id]));
    }
    case "advisors": {
      const rows = await prisma.advisor.findMany({ select: { id: true, name: true } });
      return new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.id]));
    }
    default:
      return new Map();
  }
}

function prepare(entity: string, rows: Row[], look: Lookups, context: string) {
  const validator = validators[entity]!;
  const issues: RowIssue[] = [];
  const prepared: Array<Prepared & { row: number }> = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2; // 1-based, after the header row
    const result = validator(row, look, context);
    if (typeof result === "string") {
      issues.push({ row: line, message: result });
      return;
    }
    if (seen.has(result.key)) {
      issues.push({
        row: line,
        message: `the same ${IMPORT_ENTITIES[entity]!.matchKey[0]} appears twice in the file`,
      });
      return;
    }
    seen.add(result.key);
    prepared.push({ ...result, row: line });
  });

  return { prepared, issues };
}

const requestSchema = z.object({
  entity: z.string(),
  rows: z.array(z.record(z.string(), z.string())).max(MAX_ROWS),
  context: z.string().default(""),
});

/** Step 3: validate everything, report per-row problems and duplicate count. */
export async function previewImport(raw: unknown): Promise<ImportPreview> {
  await requirePermission("import.run");
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success || !IMPORT_ENTITIES[parsed.data.entity]) {
    return {
      ok: false,
      error: "The file could not be read.",
      total: 0,
      valid: 0,
      duplicates: 0,
      issues: [],
    };
  }
  const { entity, rows, context } = parsed.data;
  const { prepared, issues } = prepare(entity, rows, await lookups(), context);
  const existing = await existingKeys(
    entity,
    prepared.map((p) => p.key),
    context,
  );
  return {
    ok: true,
    total: rows.length,
    valid: prepared.length,
    duplicates: prepared.filter((p) => existing.has(p.key)).length,
    issues,
  };
}

/** Step 4: write in chunks of 200, one transaction per chunk. */
export async function runImport(
  raw: unknown,
  options: { mode: DuplicateMode; fileName: string },
): Promise<ImportSummary> {
  const admin = await requirePermission("import.run");
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success || !IMPORT_ENTITIES[parsed.data.entity]) {
    return {
      ok: false,
      error: "The file could not be read.",
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      issues: [],
    };
  }
  const { entity, rows, context } = parsed.data;
  const look = await lookups();
  const { prepared, issues } = prepare(entity, rows, look, context);
  const existing = await existingKeys(
    entity,
    prepared.map((p) => p.key),
    context,
  );

  // Board rows link to students by board roll on the way in.
  const boardStudents =
    entity === "board-results"
      ? new Map(
          (
            await prisma.student.findMany({
              where: { boardRoll: { in: prepared.map((p) => p.key) } },
              select: { id: true, boardRoll: true },
            })
          ).map((s) => [s.boardRoll!, s.id]),
        )
      : new Map<string, string>();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let start = 0; start < prepared.length; start += 200) {
    const chunk = prepared.slice(start, start + 200);
    const ops: Array<ReturnType<typeof buildOp>> = [];
    for (const item of chunk) {
      const id = existing.get(item.key);
      if (id && options.mode === "skip") {
        skipped += 1;
        continue;
      }
      const data =
        entity === "board-results"
          ? { ...item.data, studentId: boardStudents.get(item.key) ?? null }
          : item.data;
      ops.push(buildOp(entity, id ?? null, data));
      if (id) updated += 1;
      else created += 1;
    }
    if (ops.length > 0) await prisma.$transaction(ops as never[]);
  }

  const job = await prisma.importJob.create({
    data: {
      entity,
      fileName: options.fileName.slice(0, 200),
      uploadedById: admin.id,
      total: rows.length,
      created,
      updated,
      skipped: skipped + issues.length,
      errors: issues,
    },
  });
  await logActivity(admin.id, "import", entity, job.id);

  for (const path of [
    "/admin/students",
    "/admin/certificates",
    "/admin/advisors",
    "/results",
    "/verify",
    "/advisors",
  ]) {
    revalidatePath(path);
  }
  if (entity === "board-results")
    revalidatePath(`/admin/board-exams/${context}/results`);

  return {
    ok: true,
    jobId: job.id,
    total: rows.length,
    created,
    updated,
    skipped: skipped + issues.length,
    issues,
  };
}

function buildOp(entity: string, id: string | null, data: Record<string, unknown>) {
  switch (entity) {
    case "students":
      return id
        ? prisma.student.update({ where: { id }, data })
        : prisma.student.create({ data: data as never });
    case "certificates":
      return id
        ? prisma.certificate.update({ where: { id }, data })
        : prisma.certificate.create({ data: data as never });
    case "board-results":
      return id
        ? prisma.boardResult.update({ where: { id }, data })
        : prisma.boardResult.create({ data: data as never });
    case "advisors":
      return id
        ? prisma.advisor.update({ where: { id }, data })
        : prisma.advisor.create({ data: data as never });
    default:
      throw new Error(`Unknown import entity ${entity}`);
  }
}

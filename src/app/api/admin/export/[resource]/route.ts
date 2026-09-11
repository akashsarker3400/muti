import { NextResponse } from "next/server";

import { currentAdmin, logActivity } from "@/lib/admin-auth";
import { csvCell } from "@/lib/admin/csv";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Exporter = {
  permission?: "certificates.manage" | "advisors.manage" | "results.manage";
  header: string[];
  rows: (params: URLSearchParams) => Promise<Row[]>;
  cells: (row: Row) => unknown[];
};

const date = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : "";

/**
 * Whole-table CSV downloads (addendum 3, §1/§3/§5). The columns are the same
 * ones the importer accepts, so an export can be edited and re-imported.
 */
const EXPORTERS: Record<string, Exporter> = {
  students: {
    header: [
      "roll",
      "name",
      "name_bn",
      "phone",
      "email",
      "gender",
      "dob",
      "father_name",
      "mother_name",
      "nid",
      "bmdc",
      "address",
      "course_code",
      "batch_name",
      "admission_date",
      "completion_date",
      "status",
      "grade",
      "board_roll",
      "board_registration_no",
      "verifiable",
    ],
    rows: () =>
      prisma.student.findMany({
        include: {
          course: { select: { code: true } },
          batch: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    cells: (r) => [
      r.roll,
      r.name,
      r.nameBn,
      r.phone,
      r.email,
      r.gender,
      date(r.dateOfBirth),
      r.fatherName,
      r.motherName,
      r.nid,
      r.bmdc,
      r.address,
      (r.course as { code: string }).code,
      (r.batch as { name: string } | null)?.name,
      date(r.admissionDate),
      date(r.completionDate),
      r.status,
      r.resultGrade,
      r.boardRoll,
      r.boardRegistrationNo,
      r.verifiable ? "yes" : "no",
    ],
  },
  certificates: {
    permission: "certificates.manage",
    header: [
      "certificate_no",
      "roll",
      "bmdc",
      "student_name",
      "course_code",
      "type",
      "session",
      "batch_name",
      "issued_at",
      "grade",
      "status",
      "revoked_reason",
    ],
    rows: () =>
      prisma.certificate.findMany({
        where: { deletedAt: null },
        include: { student: true, course: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
      }),
    cells: (r) => {
      const s = r.student as { roll: string; bmdc: string | null; name: string };
      return [
        r.certificateNo,
        s.roll,
        s.bmdc,
        s.name,
        (r.course as { code: string }).code,
        r.type,
        r.session,
        r.batchName,
        date(r.issuedAt),
        r.grade,
        r.status,
        r.revokedReason,
      ];
    },
  },
  "board-results": {
    permission: "results.manage",
    header: [
      "roll",
      "registration_no",
      "student_name",
      "status",
      "gpa",
      "failed_subjects",
      "remark",
    ],
    rows: (params) =>
      prisma.boardResult.findMany({
        where: { boardExamId: params.get("examId") ?? "" },
        include: { student: { select: { name: true } } },
        orderBy: { roll: "asc" },
      }),
    cells: (r) => [
      r.roll,
      r.registrationNo,
      r.studentName ?? (r.student as { name: string } | null)?.name,
      r.status,
      r.gpa == null ? "" : Number(r.gpa).toFixed(2),
      r.failedSubjects,
      r.remark,
    ],
  },
  advisors: {
    permission: "advisors.manage",
    header: [
      "name",
      "name_bn",
      "degrees",
      "designation",
      "designation_bn",
      "organization",
      "category",
      "photo_url",
      "bio",
      "sort_order",
      "published",
    ],
    rows: () =>
      prisma.advisor.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    cells: (r) => [
      r.name,
      r.nameBn,
      r.degrees,
      r.designation,
      r.designationBn,
      r.organization,
      r.category,
      r.photo,
      r.bio,
      r.sortOrder,
      r.published ? "yes" : "no",
    ],
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { resource } = await params;
  const exporter = EXPORTERS[resource];
  if (!exporter) return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  if (exporter.permission && !hasPermission(admin, exporter.permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await exporter.rows(new URL(request.url).searchParams);
  const lines = [
    exporter.header.join(","),
    ...rows.map((row) => exporter.cells(row).map(csvCell).join(",")),
  ];
  await logActivity(admin.id, "export", resource);

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="muti-${resource}-${stamp}.csv"`,
    },
  });
}

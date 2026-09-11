import { NextResponse } from "next/server";

import { currentAdmin, logActivity } from "@/lib/admin-auth";
import { buildApplicationWhere } from "@/lib/admin/application-filters";
import { csvCell } from "@/lib/admin/csv";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** CSV export of the current applications filter (section 7.2). */
export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const where = buildApplicationWhere({
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    course: searchParams.get("course") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const rows = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { course: true, batch: true },
  });

  const header = [
    "Date",
    "Type",
    "Status",
    "Name",
    "Phone",
    "WhatsApp",
    "Email",
    "Course",
    "Batch",
    "Qualification",
    "Medical college",
    "BMDC",
    "Father's name",
    "Mother's name",
    "Date of birth",
    "Religion",
    "Blood group",
    "Employment",
    "National ID",
    "Present address",
    "Permanent address",
    "Education",
    "Location",
    "Preferred date",
    "Message",
    "Admin note",
    "Source",
    "Referral code",
    "Campaign",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.createdAt.toISOString(),
        row.type,
        row.status,
        row.name,
        displayPhone(row.phone),
        row.whatsapp ? displayPhone(row.whatsapp) : "",
        row.email ?? "",
        row.course ? `${row.course.nameEn} (${row.course.code})` : "",
        row.batch?.name ?? "",
        row.qualification ?? "",
        row.medicalCollege ?? "",
        row.bmdc ?? "",
        row.fatherName ?? "",
        row.motherName ?? "",
        row.dateOfBirth?.toISOString().slice(0, 10) ?? "",
        row.religion ?? "",
        row.bloodGroup ?? "",
        row.employment ?? "",
        row.nationalId ?? "",
        row.presentAddress ?? "",
        row.permanentAddress ?? "",
        Array.isArray(row.education)
          ? (
              row.education as Array<{
                exam: string;
                year: string;
                gpa: string;
                board: string;
              }>
            )
              .map((e) => [e.exam, e.year, e.gpa, e.board].filter(Boolean).join(" "))
              .join(" | ")
          : "",
        row.location ?? "",
        row.preferredDate?.toISOString().slice(0, 10) ?? "",
        row.message ?? "",
        row.adminNote ?? "",
        row.source ?? "",
        row.referralCode ?? "",
        campaignOf(row.utm),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  await logActivity(admin.id, "export-csv", "application", null);

  const filename = `muti-applications-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(
    // A BOM makes Excel open the Bangla text as UTF-8 instead of mojibake.
    "﻿" + lines.join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

/** utm_campaign out of the stored campaign JSON, if there is one. */
function campaignOf(utm: unknown): string {
  if (!utm || typeof utm !== "object") return "";
  const value = (utm as Record<string, unknown>).utm_campaign;
  return typeof value === "string" ? value : "";
}

/**
 * Quotes a CSV cell. A leading =, +, - or @ is prefixed with a single quote so
 * spreadsheet software cannot execute it as a formula.
 */

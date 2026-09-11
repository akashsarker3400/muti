import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { currentAdmin } from "@/lib/admin-auth";
import { csvCell } from "@/lib/admin/csv";
import { IMPORT_ENTITIES } from "@/lib/admin/import/entities";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Downloadable import templates (addendum 3, §3): the header row, one example
 * row, and — in the .xlsx — an "Instructions" sheet in Bangla and English.
 */
export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin || !hasPermission(admin, "import.run")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entity = IMPORT_ENTITIES[searchParams.get("entity") ?? ""];
  if (!entity) return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
  const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const headers = entity.columns.map((c) => c.key);
  const example = entity.columns.map((c) => c.example);
  const fileBase = `muti-${entity.key}-template`;

  if (format === "csv") {
    const csv = `﻿${headers.join(",")}\r\n${example.map(csvCell).join(",")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([headers, example]);
  data["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  XLSX.utils.book_append_sheet(workbook, data, entity.labelEn.slice(0, 30));

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Column", "Required", "Bangla", "English", "Example"],
    ...entity.columns.map((c) => [
      c.key,
      c.required ? "YES" : "",
      c.bn,
      c.en,
      c.example,
    ]),
    [],
    [
      "",
      "",
      "প্রথম শিটের হেডার সারি বদলাবেন না। উদাহরণ সারিটি মুছে নিজের তথ্য বসান।",
      "Keep the header row on the first sheet. Replace the example row with your data.",
    ],
    [
      "",
      "",
      "তারিখ YYYY-MM-DD আকারে; বাংলা সংখ্যা চলবে।",
      "Dates as YYYY-MM-DD; Bangla digits are accepted.",
    ],
    [
      "",
      "",
      `Rows with an existing ${entity.matchKey.join("+")} can be skipped or updated at import time.`,
      `Rows with an existing ${entity.matchKey.join("+")} can be skipped or updated at import time.`,
    ],
  ]);
  instructions["!cols"] = [
    { wch: 22 },
    { wch: 10 },
    { wch: 60 },
    { wch: 60 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
    },
  });
}

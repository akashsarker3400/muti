import { describe, expect, it } from "vitest";

import { parseCsv, parseImportDate } from "@/lib/admin/csv";

describe("parseCsv", () => {
  it("parses a simple sheet", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas inside quoted cells", () => {
    const rows = parseCsv('roll,batchName\nDMU-1,"DMU Batch, Session 2026"');
    expect(rows[1]).toEqual(["DMU-1", "DMU Batch, Session 2026"]);
  });

  it("handles escaped quotes, CRLF and a UTF-8 BOM", () => {
    const rows = parseCsv('﻿name\r\n"Dr. ""Rahim"" Uddin"\r\n');
    expect(rows).toEqual([["name"], ['Dr. "Rahim" Uddin']]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a\n\n\nb")).toEqual([["a"], ["b"]]);
  });

  it("reads Bangla text unchanged", () => {
    expect(parseCsv("name\nডা. রহিম")[1]).toEqual(["ডা. রহিম"]);
  });
});

describe("parseImportDate", () => {
  it("accepts ISO dates", () => {
    expect(parseImportDate("2026-12-20")?.toISOString()).toBe(
      "2026-12-20T00:00:00.000Z",
    );
  });

  it("accepts the day/month/year office sheets use", () => {
    expect(parseImportDate("20/12/2026")?.toISOString()).toBe(
      "2026-12-20T00:00:00.000Z",
    );
    expect(parseImportDate("5-1-2026")?.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("returns null for text it cannot read", () => {
    expect(parseImportDate("সামনের মাস")).toBeNull();
  });
});

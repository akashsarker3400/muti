import { describe, expect, it } from "vitest";

import {
  IMPORT_ENTITIES,
  matchHeaders,
  missingColumns,
  rowsToRecords,
} from "@/lib/admin/import/entities";
import {
  latinDigits,
  normalizeBmdc,
  normalizeCertificateNo,
  normalizeRoll,
  parseAdvisorCategories,
  parseBoardNotice,
  parseFailedSubjects,
  parseSubjectCodes,
} from "@/lib/verify";

describe("BMDC normalisation", () => {
  it("treats the common spellings of one number as equal", () => {
    for (const input of [
      "A-12345",
      "a 12345",
      "A12345",
      "12-345",
      " 12345 ",
      "A - 12 345",
    ]) {
      expect(normalizeBmdc(input)).toBe("12345");
    }
  });

  it("keeps a genuine letter suffix", () => {
    expect(normalizeBmdc("A-12345-D")).toBe("12345D");
  });

  it("accepts Bangla digits", () => {
    expect(normalizeBmdc("এ-১২৩৪৫".replace("এ", "A"))).toBe("12345");
    expect(latinDigits("০১৭৭৮")).toBe("01778");
  });
});

describe("certificate and roll normalisation", () => {
  it("collapses spaces and case in a certificate number", () => {
    expect(normalizeCertificateNo(" muti-c-2026-0117 ")).toBe("MUTI-C-2026-0117");
  });
  it("keeps only digits of a roll", () => {
    expect(normalizeRoll("৩৮২৫০০০১২৮")).toBe("3825000128");
    expect(normalizeRoll("38 25-000128")).toBe("3825000128");
  });
});

describe("board notice parser", () => {
  const notice = `
    Certificate in Medical Ultrasound Examination 2025
    3825000128 (4.00), 3825000129 {01101[T], 01103[T]}, 3825000130 (3.75)
    3825000131 { 02101[T,P] }
  `;

  it("extracts pass rows with GPA and fail rows with subjects", () => {
    const rows = parseBoardNotice(notice);
    expect(rows).toEqual([
      { roll: "3825000128", status: "PASS", gpa: "4.00" },
      { roll: "3825000130", status: "PASS", gpa: "3.75" },
      { roll: "3825000129", status: "FAIL", failedSubjects: "01101[T], 01103[T]" },
      { roll: "3825000131", status: "FAIL", failedSubjects: "02101[T,P]" },
    ]);
  });

  it("splits failed subjects into code + parts", () => {
    expect(parseFailedSubjects("01101[T], 01103[T,P], 02101")).toEqual([
      { code: "01101", parts: ["T"] },
      { code: "01103", parts: ["T", "P"] },
      { code: "02101", parts: [] },
    ]);
    expect(parseFailedSubjects(null)).toEqual([]);
  });
});

describe("settings text parsers", () => {
  it("reads subject codes one per line with = or :", () => {
    expect(
      parseSubjectCodes("01101 = Basic Physics\n01103: Anatomy\n\nbad line"),
    ).toEqual({
      "01101": "Basic Physics",
      "01103": "Anatomy",
    });
  });

  it("reads advisor categories in order, English optional", () => {
    expect(
      parseAdvisorCategories("ADVISOR = উপদেষ্টা | Advisors\nhonorary = সম্মানিত"),
    ).toEqual([
      { key: "ADVISOR", labelBn: "উপদেষ্টা", labelEn: "Advisors" },
      { key: "HONORARY", labelBn: "সম্মানিত", labelEn: "সম্মানিত" },
    ]);
  });
});

describe("import header matching", () => {
  const students = IMPORT_ENTITIES.students!;

  it("ignores case, spaces and underscores in headers", () => {
    expect(
      matchHeaders(students, ["Roll", "NAME", "Course Code", "board-roll", "unknown"]),
    ).toEqual({
      0: "roll",
      1: "name",
      2: "course_code",
      3: "board_roll",
    });
  });

  it("reports missing required columns", () => {
    expect(missingColumns(students, ["roll", "name"])).toEqual([
      "phone",
      "course_code",
    ]);
  });

  it("turns a table into records and drops blank lines", () => {
    const { records } = rowsToRecords(students, [
      ["roll", "name", "phone", "course_code"],
      ["R1", "Dr. A", "01778838644", "CMU"],
      ["", "", "", ""],
      ["R2", "Dr. B", "০১৭৭৮৮৩৮৬৪৪", "dmu"],
    ]);
    expect(records).toEqual([
      { roll: "R1", name: "Dr. A", phone: "01778838644", course_code: "CMU" },
      { roll: "R2", name: "Dr. B", phone: "০১৭৭৮৮৩৮৬৪৪", course_code: "dmu" },
    ]);
  });
});

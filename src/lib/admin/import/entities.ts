/**
 * Import entity definitions (addendum 3, §3): which columns each spreadsheet
 * carries, what is required, and the row key that decides "skip duplicate"
 * versus "update existing". Pure data + validation — no database calls —
 * so the templates, the client preview and the unit tests all read one
 * source. The database side lives in `src/app/actions/admin-import.ts`.
 */

export type ImportColumn = {
  key: string;
  required?: boolean;
  /** Bangla and English one-liners for the Instructions sheet. */
  bn: string;
  en: string;
  example: string;
};

export type ImportEntity = {
  key: string;
  labelBn: string;
  labelEn: string;
  /** Column(s) that identify a row for duplicate handling. */
  matchKey: string[];
  columns: ImportColumn[];
  /** Whether the UI must supply a context value (e.g. the exam). */
  needsContext?: "examId";
};

export const MAX_ROWS = 20_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const IMPORT_ENTITIES: Record<string, ImportEntity> = {
  students: {
    key: "students",
    labelBn: "শিক্ষার্থী",
    labelEn: "Students",
    matchKey: ["roll"],
    columns: [
      {
        key: "roll",
        required: true,
        bn: "রোল (MUTI-র নিজস্ব)",
        en: "Institute roll",
        example: "CMU-2025-001",
      },
      {
        key: "name",
        required: true,
        bn: "নাম (English)",
        en: "Name in English",
        example: "Dr. Rahim Uddin",
      },
      {
        key: "name_bn",
        bn: "নাম (বাংলা)",
        en: "Name in Bangla",
        example: "ডা. রহিম উদ্দিন",
      },
      {
        key: "phone",
        required: true,
        bn: "মোবাইল (বাংলা সংখ্যায় লিখলেও চলবে)",
        en: "Mobile number",
        example: "01778838644",
      },
      { key: "email", bn: "ইমেইল", en: "Email", example: "rahim@example.com" },
      {
        key: "gender",
        bn: "MALE / FEMALE / OTHER",
        en: "MALE / FEMALE / OTHER",
        example: "MALE",
      },
      {
        key: "dob",
        bn: "জন্মতারিখ YYYY-MM-DD",
        en: "Date of birth YYYY-MM-DD",
        example: "1990-05-14",
      },
      {
        key: "father_name",
        bn: "পিতার নাম",
        en: "Father's name",
        example: "Abdul Karim",
      },
      {
        key: "mother_name",
        bn: "মাতার নাম",
        en: "Mother's name",
        example: "Rahima Begum",
      },
      {
        key: "nid",
        bn: "জাতীয় পরিচয়পত্র",
        en: "National ID",
        example: "1990123456789",
      },
      { key: "bmdc", bn: "BMDC নম্বর", en: "BMDC registration", example: "A-12345" },
      { key: "address", bn: "ঠিকানা", en: "Address", example: "Charpara, Mymensingh" },
      {
        key: "course_code",
        required: true,
        bn: "কোর্স কোড (CMU, CMU-BTEB, DMU, ADMU, TVS, DOPPLER, ANOMALY)",
        en: "Course code",
        example: "CMU",
      },
      {
        key: "batch_name",
        bn: "ব্যাচের নাম (আগে থেকে থাকতে হবে)",
        en: "Batch name (must already exist)",
        example: "CMU Jan 2025",
      },
      {
        key: "admission_date",
        bn: "ভর্তির তারিখ YYYY-MM-DD",
        en: "Admission date YYYY-MM-DD",
        example: "2025-01-10",
      },
      {
        key: "status",
        bn: "ACTIVE / COMPLETED / DROPPED (ফাঁকা = ACTIVE)",
        en: "ACTIVE / COMPLETED / DROPPED (blank = ACTIVE)",
        example: "ACTIVE",
      },
      {
        key: "board_roll",
        bn: "BTEB বোর্ড রোল (১০ সংখ্যা)",
        en: "BTEB board roll (10 digits)",
        example: "3825000128",
      },
      {
        key: "board_registration_no",
        bn: "বোর্ড রেজিস্ট্রেশন নম্বর",
        en: "Board registration number",
        example: "2500012345",
      },
    ],
  },
  certificates: {
    key: "certificates",
    labelBn: "সার্টিফিকেট",
    labelEn: "Certificates",
    matchKey: ["certificate_no"],
    columns: [
      {
        key: "certificate_no",
        required: true,
        bn: "সনদে ছাপানো নম্বর",
        en: "Number as printed",
        example: "MUTI-C-2026-0117",
      },
      {
        key: "roll",
        bn: "শিক্ষার্থীর রোল (roll বা bmdc — একটি লাগবে)",
        en: "Student roll (roll or bmdc required)",
        example: "CMU-2025-001",
      },
      {
        key: "bmdc",
        bn: "শিক্ষার্থীর BMDC (roll না থাকলে)",
        en: "Student BMDC (if no roll)",
        example: "",
      },
      {
        key: "course_code",
        required: true,
        bn: "কোর্স কোড",
        en: "Course code",
        example: "CMU",
      },
      {
        key: "type",
        bn: "COURSE / SEMESTER / BOARD (ফাঁকা = COURSE)",
        en: "COURSE / SEMESTER / BOARD (blank = COURSE)",
        example: "COURSE",
      },
      { key: "session", bn: "সেশন", en: "Session", example: "Jan-June 2025" },
      { key: "batch_name", bn: "ব্যাচ", en: "Batch", example: "CMU Jan 2025" },
      {
        key: "issued_at",
        bn: "প্রদানের তারিখ YYYY-MM-DD",
        en: "Issue date YYYY-MM-DD",
        example: "2025-08-20",
      },
      { key: "grade", bn: "গ্রেড", en: "Grade", example: "4.00" },
      {
        key: "status",
        bn: "VALID / REVOKED (ফাঁকা = VALID)",
        en: "VALID / REVOKED (blank = VALID)",
        example: "VALID",
      },
      {
        key: "revoked_reason",
        bn: "বাতিলের কারণ",
        en: "Revocation reason",
        example: "",
      },
    ],
  },
  "board-results": {
    key: "board-results",
    labelBn: "বোর্ড ফলাফল",
    labelEn: "Board results",
    matchKey: ["roll"],
    needsContext: "examId",
    columns: [
      {
        key: "roll",
        required: true,
        bn: "বোর্ড রোল (১০ সংখ্যা)",
        en: "Board roll (10 digits)",
        example: "3825000128",
      },
      {
        key: "registration_no",
        bn: "রেজিস্ট্রেশন নম্বর",
        en: "Registration number",
        example: "2500012345",
      },
      {
        key: "student_name",
        bn: "নাম (শিক্ষার্থী লিংক না থাকলে দেখাতে)",
        en: "Name (shown when no student is linked)",
        example: "Dr. Rahim Uddin",
      },
      {
        key: "status",
        required: true,
        bn: "PASS / FAIL / WITHHELD / ABSENT",
        en: "PASS / FAIL / WITHHELD / ABSENT",
        example: "PASS",
      },
      { key: "gpa", bn: "GPA (উত্তীর্ণ হলে)", en: "GPA (if passed)", example: "4.00" },
      {
        key: "failed_subjects",
        bn: "অনুত্তীর্ণ বিষয় যেমন 01101[T], 01103[T,P]",
        en: "Failed subjects e.g. 01101[T], 01103[T,P]",
        example: "",
      },
      { key: "remark", bn: "মন্তব্য", en: "Remark", example: "" },
    ],
  },
  advisors: {
    key: "advisors",
    labelBn: "উপদেষ্টা মণ্ডলী",
    labelEn: "Advisors",
    matchKey: ["name"],
    columns: [
      {
        key: "name",
        required: true,
        bn: "নাম (English)",
        en: "Name in English",
        example: "Prof. Dr. A. K. M. Hasan",
      },
      {
        key: "name_bn",
        bn: "নাম (বাংলা)",
        en: "Name in Bangla",
        example: "অধ্যাপক ডা. এ. কে. এম. হাসান",
      },
      {
        key: "degrees",
        bn: "ডিগ্রি",
        en: "Degrees",
        example: "MBBS, FCPS (Radiology)",
      },
      {
        key: "designation",
        required: true,
        bn: "পদবি (English)",
        en: "Designation",
        example: "Professor of Radiology",
      },
      {
        key: "designation_bn",
        bn: "পদবি (বাংলা)",
        en: "Designation in Bangla",
        example: "রেডিওলজি বিভাগের অধ্যাপক",
      },
      {
        key: "organization",
        bn: "প্রতিষ্ঠান",
        en: "Organization",
        example: "Mymensingh Medical College",
      },
      {
        key: "category",
        bn: "ক্যাটাগরি KEY (সাইট সেটিংস দেখুন; ফাঁকা = ADVISOR)",
        en: "Category key (see Site Settings; blank = ADVISOR)",
        example: "ADVISOR",
      },
      {
        key: "photo_url",
        bn: "ছবির পাথ /uploads/…",
        en: "Photo path /uploads/…",
        example: "",
      },
      { key: "bio", bn: "সংক্ষিপ্ত পরিচিতি", en: "Short bio", example: "" },
      { key: "sort_order", bn: "ক্রম (ছোট আগে)", en: "Sort order", example: "1" },
    ],
  },
};

/** "Course Code", "course_code", "COURSE-CODE" -> "coursecode". */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_\-]+/g, "");
}

/** Maps a spreadsheet's header row onto entity column keys; unknown headers are ignored. */
export function matchHeaders(
  entity: ImportEntity,
  headers: string[],
): Record<number, string> {
  const wanted = new Map(
    entity.columns.map((column) => [normalizeHeader(column.key), column.key]),
  );
  const mapping: Record<number, string> = {};
  headers.forEach((header, index) => {
    const key = wanted.get(normalizeHeader(header));
    if (key) mapping[index] = key;
  });
  return mapping;
}

/** Which required columns the header row is missing. */
export function missingColumns(entity: ImportEntity, headers: string[]): string[] {
  const present = new Set(Object.values(matchHeaders(entity, headers)));
  return entity.columns
    .filter((c) => c.required && !present.has(c.key))
    .map((c) => c.key);
}

/** Header row + cell rows -> plain objects keyed by column key. Blank lines are dropped. */
export function rowsToRecords(
  entity: ImportEntity,
  table: string[][],
): { records: Array<Record<string, string>>; headers: string[] } {
  const [headerRow = [], ...body] = table;
  const mapping = matchHeaders(entity, headerRow);
  const records = body
    .map((cells) => {
      const record: Record<string, string> = {};
      for (const [index, key] of Object.entries(mapping)) {
        record[key] = String(cells[Number(index)] ?? "").trim();
      }
      return record;
    })
    .filter((record) => Object.values(record).some((value) => value !== ""));
  return { records, headers: headerRow };
}

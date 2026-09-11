import type { FormSection, FormValues } from "@/lib/admin/fields";

/**
 * Field layout for the course editor (section 7.3): Basics, Fees, Content and
 * SEO tabs. The routine table is rendered separately by RoutineEditor.
 */
export const courseFormSections: FormSection[] = [
  {
    id: "basics",
    label: "Basics",
    fields: [
      {
        name: "code",
        label: "Code",
        type: "text",
        required: true,
        latin: true,
        placeholder: "CMU, DMU, ADMU…",
      },
      {
        name: "slug",
        label: "URL slug",
        type: "text",
        latin: true,
        hint: "Leave empty to generate from the English name. Changing it breaks old links.",
      },
      {
        name: "nameBn",
        label: "Short name (Bangla)",
        type: "text",
        lang: "bn",
      },
      {
        name: "fullNameBn",
        label: "Full name (Bangla)",
        type: "text",
        lang: "bn",
      },
      {
        name: "durationLabelBn",
        label: "Duration label (Bangla)",
        type: "text",
        lang: "bn",
        placeholder: "3 months",
      },
      {
        name: "certificateNoteBn",
        label: "Certificate note (Bangla)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "nameEn",
        label: "Short name (English)",
        type: "text",
        required: true,
        latin: true,
        lang: "en",
      },
      {
        name: "fullNameEn",
        label: "Full name (English)",
        type: "text",
        required: true,
        latin: true,
        lang: "en",
      },
      {
        name: "durationLabelEn",
        label: "Duration label (English)",
        type: "text",
        latin: true,
        lang: "en",
        placeholder: "3 months",
      },
      {
        name: "certificateNoteEn",
        label: "Certificate note (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "level",
        label: "Level",
        type: "select",
        required: true,
        options: [
          { value: "CERTIFICATE", label: "Certificates" },
          { value: "DIPLOMA", label: "Diploma" },
          { value: "SPECIAL", label: "Special" },
        ],
      },
      {
        name: "durationMonths",
        label: "Duration (months)",
        type: "number",
        hint: "A value of 0 shows “Contact the office for duration” on the website.",
      },
      {
        name: "affiliationNote",
        label: "Affiliation note",
        type: "text",
        latin: true,
        placeholder: "BTEB approved",
        hint: "Shown as a badge on the course page. Leave empty for no badge.",
      },
      { name: "image", label: "Course image", type: "image" },
      { name: "sortOrder", label: "Order (lowest first)", type: "number" },
      { name: "admissionOpen", label: "Admission open", type: "checkbox" },
      { name: "featured", label: "Featured", type: "checkbox" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
  {
    id: "fees",
    label: "Fees",
    /**
     * Note to the office, from section 8 of the build spec: the owner's
     * headline totals differ from the official admission PDFs. Both are shown
     * here so staff can decide which to publish — nothing is invented.
     */
    description:
      "The owner’s all-inclusive totals: CMU Regular 13,500 · CMU BTEB 37,500 · DMU 80,000 · ADMU 1,00,000 · TVS 30,000. The website currently shows the itemised fees from the admission PDFs; change them here if needed. A course fee of 0 shows “Contact for fee” on the website.",
    fields: [
      { name: "courseFee", label: "Course fee (Tk)", type: "number", required: true },
      { name: "examFee", label: "Exam & form fee (Tk)", type: "number" },
      { name: "formFee", label: "Admission form fee (Tk)", type: "number" },
      { name: "bookFee", label: "Books (Tk)", type: "number" },
      {
        name: "offerPrice",
        label: "Offer price (Tk)",
        type: "number",
        hint: "The struck-through price appears only when both the offer price and the offer label are set.",
      },
      { name: "offerLabelBn", label: "Offer label (Bangla)", type: "text", lang: "bn" },
      {
        name: "offerLabelEn",
        label: "Offer label (English)",
        type: "text",
        latin: true,
        lang: "en",
      },
      { name: "lectureClasses", label: "Lecture classes", type: "number" },
      {
        name: "practicalClasses",
        label: "Practical classes",
        type: "number",
      },
    ],
  },
  {
    id: "content",
    label: "Description",
    fields: [
      {
        name: "overviewBn",
        label: "Course overview (Bangla)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "eligibilityBn",
        label: "Eligibility (Bangla)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "overviewEn",
        label: "Course overview (English)",
        type: "richtext",
        lang: "en",
      },
      {
        name: "eligibilityEn",
        label: "Eligibility (English)",
        type: "richtext",
        lang: "en",
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    description:
      "Leave empty to use the default title and description from Site Settings.",
    fields: [
      { name: "metaTitle", label: "Meta title", type: "text", full: true },
      {
        name: "metaDescription",
        label: "Meta description",
        type: "textarea",
        hint: "Best kept between 150 and 160 characters.",
      },
    ],
  },
];

/** Database row -> form values for the course editor. */
export function courseToForm(row: Record<string, unknown>): FormValues {
  const text = (value: unknown) => (value == null ? "" : String(value));
  const number = (value: unknown) => (value == null ? "" : Number(value));

  return {
    code: text(row.code),
    slug: text(row.slug),
    nameEn: text(row.nameEn),
    nameBn: text(row.nameBn),
    fullNameEn: text(row.fullNameEn),
    fullNameBn: text(row.fullNameBn),
    level: text(row.level) || "CERTIFICATE",
    durationMonths: row.durationMonths == null ? 0 : Number(row.durationMonths),
    durationLabelEn: text(row.durationLabelEn),
    durationLabelBn: text(row.durationLabelBn),
    courseFee: row.courseFee == null ? 0 : Number(row.courseFee),
    examFee: number(row.examFee),
    formFee: number(row.formFee),
    bookFee: number(row.bookFee),
    offerPrice: number(row.offerPrice),
    offerLabelEn: text(row.offerLabelEn),
    offerLabelBn: text(row.offerLabelBn),
    lectureClasses: number(row.lectureClasses),
    practicalClasses: number(row.practicalClasses),
    overviewEn: text(row.overviewEn),
    overviewBn: text(row.overviewBn),
    eligibilityEn: text(row.eligibilityEn),
    eligibilityBn: text(row.eligibilityBn),
    certificateNoteEn: text(row.certificateNoteEn),
    certificateNoteBn: text(row.certificateNoteBn),
    affiliationNote: text(row.affiliationNote),
    image: text(row.image),
    admissionOpen: row.admissionOpen === undefined ? true : Boolean(row.admissionOpen),
    published: row.published === undefined ? true : Boolean(row.published),
    featured: Boolean(row.featured),
    sortOrder: row.sortOrder == null ? 0 : Number(row.sortOrder),
    metaTitle: text(row.metaTitle),
    metaDescription: text(row.metaDescription),
  };
}

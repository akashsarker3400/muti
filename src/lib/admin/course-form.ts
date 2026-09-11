import type { FormSection, FormValues } from "@/lib/admin/fields";

/**
 * Field layout for the course editor (section 7.3): Basics, Fees, Content and
 * SEO tabs. The routine table is rendered separately by RoutineEditor.
 */
export const courseFormSections: FormSection[] = [
  {
    id: "basics",
    label: "মূল তথ্য",
    fields: [
      {
        name: "code",
        label: "কোড",
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
        hint: "ফাঁকা রাখলে ইংরেজি নাম থেকে তৈরি হবে। পরিবর্তন করলে পুরনো লিংক ভেঙে যাবে।",
      },
      {
        name: "nameBn",
        label: "সংক্ষিপ্ত নাম (বাংলা)",
        type: "text",
        required: true,
        lang: "bn",
      },
      {
        name: "fullNameBn",
        label: "পূর্ণ নাম (বাংলা)",
        type: "text",
        required: true,
        lang: "bn",
      },
      {
        name: "durationLabelBn",
        label: "সময়কাল (বাংলা)",
        type: "text",
        lang: "bn",
        placeholder: "৩ মাস",
      },
      {
        name: "certificateNoteBn",
        label: "সার্টিফিকেট নোট (বাংলা)",
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
        label: "স্তর",
        type: "select",
        required: true,
        options: [
          { value: "CERTIFICATE", label: "সার্টিফিকেট" },
          { value: "DIPLOMA", label: "ডিপ্লোমা" },
          { value: "SPECIAL", label: "স্পেশাল" },
        ],
      },
      {
        name: "durationMonths",
        label: "সময়কাল (মাস)",
        type: "number",
        hint: "০ দিলে ওয়েবসাইটে “সময়কাল জানতে অফিসে যোগাযোগ করুন” দেখাবে।",
      },
      {
        name: "affiliationNote",
        label: "অনুমোদন নোট",
        type: "text",
        latin: true,
        placeholder: "BTEB approved",
        hint: "কোর্স পেজে ব্যাজ হিসেবে দেখাবে। ফাঁকা রাখলে ব্যাজ দেখাবে না।",
      },
      { name: "image", label: "কোর্সের ছবি", type: "image" },
      { name: "sortOrder", label: "ক্রম (ছোট আগে)", type: "number" },
      { name: "admissionOpen", label: "ভর্তি চলছে", type: "checkbox" },
      { name: "featured", label: "ফিচার্ড", type: "checkbox" },
      { name: "published", label: "প্রকাশিত", type: "checkbox" },
    ],
  },
  {
    id: "fees",
    label: "ফি",
    /**
     * Note to the office, from section 8 of the build spec: the owner's
     * headline totals differ from the official admission PDFs. Both are shown
     * here so staff can decide which to publish — nothing is invented.
     */
    description:
      "মালিকের দেওয়া সর্বমোট (সব খরচসহ) হিসাব: CMU Regular ১৩,৫০০ · CMU BTEB ৩৭,৫০০ · DMU ৮০,০০০ · ADMU ১,০০,০০০ · TVS ৩০,০০০। ওয়েবসাইটে বর্তমানে ভর্তি PDF অনুযায়ী আলাদা আলাদা ফি বসানো আছে; প্রয়োজনে এখান থেকে পরিবর্তন করুন। কোর্স ফি ০ দিলে ওয়েবসাইটে “ফি জানতে যোগাযোগ করুন” দেখাবে।",
    fields: [
      { name: "courseFee", label: "কোর্স ফি (৳)", type: "number", required: true },
      { name: "examFee", label: "পরীক্ষা ও ফরম ফিলাপ ফি (৳)", type: "number" },
      { name: "formFee", label: "ভর্তি ফরম ফি (৳)", type: "number" },
      { name: "bookFee", label: "বই (৳)", type: "number" },
      {
        name: "offerPrice",
        label: "অফার মূল্য (৳)",
        type: "number",
        hint: "অফার মূল্য ও অফার লেবেল — দুটোই দিলে তবেই কাটা দাম দেখানো হবে।",
      },
      { name: "offerLabelBn", label: "অফার লেবেল (বাংলা)", type: "text", lang: "bn" },
      {
        name: "offerLabelEn",
        label: "Offer label (English)",
        type: "text",
        latin: true,
        lang: "en",
      },
      { name: "lectureClasses", label: "লেকচার ক্লাস সংখ্যা", type: "number" },
      {
        name: "practicalClasses",
        label: "প্র্যাকটিক্যাল ক্লাস সংখ্যা",
        type: "number",
      },
    ],
  },
  {
    id: "content",
    label: "বিবরণ",
    fields: [
      {
        name: "overviewBn",
        label: "কোর্স পরিচিতি (বাংলা)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "eligibilityBn",
        label: "ভর্তির যোগ্যতা (বাংলা)",
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
    description: "ফাঁকা রাখলে সাইট সেটিংসের ডিফল্ট শিরোনাম ও বিবরণ ব্যবহার হবে।",
    fields: [
      { name: "metaTitle", label: "Meta title", type: "text", full: true },
      {
        name: "metaDescription",
        label: "Meta description",
        type: "textarea",
        hint: "১৫০–১৬০ অক্ষরের মধ্যে রাখলে ভালো।",
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

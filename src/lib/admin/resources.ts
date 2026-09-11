import "server-only";

import { z } from "zod";

import type { FormSection, FormValues } from "@/lib/admin/fields";
import { slugify } from "@/lib/admin/slug";
import type { Permission } from "@/lib/permissions";
import { normalizeBmdc, parseAdvisorCategories } from "@/lib/verify";
import { defaultSiteSettings } from "@/lib/site-settings-schema";
import { prisma } from "@/lib/prisma";

/**
 * Registry for the CRUD screens that share one implementation (section 7.7 and
 * 7.8, plus batches, results, students, blog and pages). Courses,
 * applications, gallery, settings, users, media and the activity log have
 * their own pages because their editors are not a flat field list.
 *
 * `/admin/[resource]` renders the list, `/admin/[resource]/new` and
 * `/admin/[resource]/[id]` render this form.
 */

/**
 * List columns are plain data so the registry stays a .ts module; the list
 * page renders each `type` generically.
 */
export type ResourceColumn = {
  key: string;
  label: string;
  type?: "text" | "date" | "bool" | "image" | "badge" | "number";
  /** For `type: "badge"`, maps a value to its Bangla label. */
  labels?: Record<string, string>;
  /** Dotted path into an included relation, e.g. "course.nameEn". */
  path?: string;
  hideOnMobile?: boolean;
};

export type OptionList = Array<{ value: string; label: string }>;
export type OptionMap = Record<string, OptionList>;

export type ResourceConfig = {
  key: string;
  /** Prisma delegate name on the client. */
  model:
    | "contentItem"
    | "notice"
    | "faculty"
    | "testimonial"
    | "faq"
    | "partner"
    | "banner"
    | "download"
    | "post"
    | "page"
    | "batch"
    | "result"
    | "student"
    | "certificate"
    | "boardExam"
    | "leadershipMessage"
    | "advisor";
  title: string;
  singular: string;
  description?: string;
  newLabel: string;
  /**
   * Restricts the list to one slice of a shared table, and is merged into the
   * data of every create — this is how the six ContentItem editors work.
   */
  baseWhere?: Record<string, unknown>;
  columns: ResourceColumn[];
  /** Renders an extra action in each row, e.g. "clone" on batches. */
  rowTool?: "batch-clone" | "board-results";
  /** Entity key on /admin/import — shows an "Import" button above the list. */
  importEntity?: string;
  /** Offers a CSV download of the whole table from the list header. */
  exportCsv?: boolean;
  /** Extra read-only panel under the edit form. */
  detailPanel?: "student-certificates";
  /** Named permission (addendum 3, §8) needed to open the list or save. */
  permission?: Permission;
  searchFields: string[];
  orderBy: Record<string, "asc" | "desc">[];
  include?: Record<string, boolean>;
  schema: z.ZodType;
  sections: (options: OptionMap) => FormSection[];
  loadOptions?: () => Promise<OptionMap>;
  /** Database row -> form values. */
  toForm: (row: Record<string, unknown>) => FormValues;
  /** Form values -> Prisma data. Runs after `schema` has validated. */
  toData: (values: Record<string, unknown>) => Record<string, unknown>;
  /**
   * Last chance to adjust the data, given the row as it is today (null when
   * creating). Used by batches to notice a hand-edited seat count.
   */
  beforeWrite?: (
    data: Record<string, unknown>,
    existing: Record<string, unknown> | null,
  ) => Record<string, unknown>;
  /** Runs after a successful create or update — cache tags, counters, … */
  afterWrite?: (
    row: { id: string },
    data: Record<string, unknown>,
    existing: Record<string, unknown> | null,
  ) => Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

const text = z.string().trim();
const optionalText = text.optional().default("");
const requiredText = text.min(1, "এই ফিল্ডটি আবশ্যক");

/** Empty string -> null, so optional columns stay NULL rather than "". */
function nullable(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function optionalInt(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

/** "YYYY-MM-DD" -> Date at UTC midnight, or null. */
function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date -> "YYYY-MM-DD" for date inputs. */
function fromDate(value: unknown): string {
  if (!(value instanceof Date)) return "";
  return value.toISOString().slice(0, 10);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

const publishedField = {
  name: "published",
  label: "প্রকাশিত",
  type: "checkbox" as const,
};

const sortOrderField = {
  name: "sortOrder",
  label: "ক্রম (ছোট আগে)",
  type: "number" as const,
  hint: "১০, ২০, ৩০ … দিলে পরে মাঝখানে নতুন আইটেম বসানো সহজ হয়।",
};

/* -------------------------------------------------------------------------- */
/* Option loaders                                                             */
/* -------------------------------------------------------------------------- */

async function courseOptions(): Promise<OptionList> {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameEn: true, code: true },
  });
  return courses.map((course) => ({
    value: course.id,
    label: `${course.nameEn} (${course.code})`,
  }));
}

async function batchOptions(): Promise<OptionList> {
  const batches = await prisma.batch.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  return batches.map((batch) => ({ value: batch.id, label: batch.name }));
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

const noticeResource: ResourceConfig = {
  key: "notices",
  model: "notice",
  title: "নোটিশ",
  singular: "নোটিশ",
  description: "মেয়াদ শেষ হওয়া নোটিশ ওয়েবসাইটে স্বয়ংক্রিয়ভাবে লুকিয়ে যায়।",
  newLabel: "নতুন নোটিশ",
  columns: [
    { key: "titleBn", label: "শিরোনাম" },
    {
      key: "category",
      label: "ধরন",
      type: "badge",
      labels: {
        ADMISSION: "ভর্তি",
        EXAM: "পরীক্ষা",
        RESULT: "ফলাফল",
        HOLIDAY: "ছুটি",
        GENERAL: "সাধারণ",
      },
      hideOnMobile: true,
    },
    { key: "pinned", label: "পিন", type: "bool", hideOnMobile: true },
    { key: "publishedAt", label: "প্রকাশ", type: "date", hideOnMobile: true },
    { key: "expiresAt", label: "মেয়াদ", type: "date", hideOnMobile: true },
  ],
  searchFields: ["titleBn", "titleEn", "slug"],
  orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  schema: z.object({
    titleBn: requiredText,
    titleEn: optionalText,
    slug: optionalText,
    bodyBn: requiredText,
    bodyEn: optionalText,
    category: z.enum(["ADMISSION", "EXAM", "RESULT", "HOLIDAY", "GENERAL"]),
    pinned: z.boolean().default(false),
    published: z.boolean().default(true),
    publishedAt: optionalText,
    expiresAt: optionalText,
  }),
  sections: () => [
    {
      id: "content",
      label: "নোটিশ",
      fields: [
        {
          name: "titleBn",
          label: "শিরোনাম (বাংলা)",
          type: "text",
          required: true,
          lang: "bn",
          full: true,
        },
        { name: "bodyBn", label: "বিবরণ (বাংলা)", type: "richtext", lang: "bn" },
        {
          name: "titleEn",
          label: "Title (English)",
          type: "text",
          lang: "en",
          latin: true,
          full: true,
        },
        { name: "bodyEn", label: "Body (English)", type: "richtext", lang: "en" },
        {
          name: "category",
          label: "ধরন",
          type: "select",
          options: [
            { value: "ADMISSION", label: "ভর্তি" },
            { value: "EXAM", label: "পরীক্ষা" },
            { value: "RESULT", label: "ফলাফল" },
            { value: "HOLIDAY", label: "ছুটি" },
            { value: "GENERAL", label: "সাধারণ" },
          ],
        },
        {
          name: "slug",
          label: "URL slug",
          type: "text",
          latin: true,
          hint: "ফাঁকা রাখলে শিরোনাম থেকে তৈরি হবে।",
        },
        { name: "publishedAt", label: "প্রকাশের তারিখ", type: "date" },
        {
          name: "expiresAt",
          label: "মেয়াদ শেষের তারিখ",
          type: "date",
          hint: "এই তারিখের পর নোটিশ আর দেখাবে না। ফাঁকা রাখলে মেয়াদ নেই।",
        },
        { name: "pinned", label: "উপরে পিন করুন", type: "checkbox" },
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    titleBn: str(row.titleBn),
    titleEn: str(row.titleEn),
    slug: str(row.slug),
    bodyBn: str(row.bodyBn),
    bodyEn: str(row.bodyEn),
    category: str(row.category) || "GENERAL",
    pinned: Boolean(row.pinned),
    published: row.published === undefined ? true : Boolean(row.published),
    publishedAt: fromDate(row.publishedAt),
    expiresAt: fromDate(row.expiresAt),
  }),
  toData: (values) => ({
    titleBn: str(values.titleBn),
    titleEn: nullable(values.titleEn),
    slug: slugify(str(values.slug) || str(values.titleEn) || str(values.titleBn)),
    bodyBn: str(values.bodyBn),
    bodyEn: nullable(values.bodyEn),
    category: str(values.category) || "GENERAL",
    pinned: Boolean(values.pinned),
    published: Boolean(values.published),
    publishedAt: toDate(values.publishedAt) ?? new Date(),
    expiresAt: toDate(values.expiresAt),
  }),
};

const facultyResource: ResourceConfig = {
  key: "faculty",
  model: "faculty",
  title: "শিক্ষকমণ্ডলী",
  singular: "শিক্ষক",
  newLabel: "নতুন শিক্ষক",
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "name", label: "নাম" },
    { key: "designation", label: "পদবি", hideOnMobile: true },
    { key: "degrees", label: "ডিগ্রি", hideOnMobile: true },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
  ],
  searchFields: ["name", "designation", "degrees"],
  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  schema: z.object({
    name: requiredText,
    nameBn: optionalText,
    degrees: requiredText,
    designation: requiredText,
    designationBn: optionalText,
    bio: optionalText,
    photo: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "শিক্ষক",
      fields: [
        {
          name: "name",
          label: "নাম (English)",
          type: "text",
          required: true,
          latin: true,
          lang: "en",
        },
        {
          name: "designation",
          label: "Designation (English)",
          type: "text",
          required: true,
          latin: true,
          lang: "en",
        },
        { name: "nameBn", label: "নাম (বাংলা)", type: "text", lang: "bn" },
        { name: "designationBn", label: "পদবি (বাংলা)", type: "text", lang: "bn" },
        {
          name: "degrees",
          label: "ডিগ্রি",
          type: "text",
          required: true,
          latin: true,
          full: true,
          placeholder: "MBBS, DMU, CMU",
        },
        { name: "bio", label: "সংক্ষিপ্ত পরিচিতি", type: "textarea" },
        { name: "photo", label: "ছবি", type: "image" },
        sortOrderField,
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    name: str(row.name),
    nameBn: str(row.nameBn),
    degrees: str(row.degrees),
    designation: str(row.designation),
    designationBn: str(row.designationBn),
    bio: str(row.bio),
    photo: str(row.photo),
    sortOrder: toInt(row.sortOrder),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    name: str(values.name),
    nameBn: nullable(values.nameBn),
    degrees: str(values.degrees),
    designation: str(values.designation),
    designationBn: nullable(values.designationBn),
    bio: nullable(values.bio),
    photo: nullable(values.photo),
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

const testimonialResource: ResourceConfig = {
  key: "testimonials",
  model: "testimonial",
  title: "শিক্ষার্থীদের অভিমত",
  singular: "অভিমত",
  newLabel: "নতুন অভিমত",
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "name", label: "নাম" },
    { key: "course", label: "কোর্স", hideOnMobile: true },
    { key: "rating", label: "রেটিং", type: "number", hideOnMobile: true },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
  ],
  searchFields: ["name", "course", "batch"],
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  schema: z.object({
    name: requiredText,
    course: optionalText,
    batch: optionalText,
    text: requiredText,
    photo: optionalText,
    rating: z.coerce.number().int().min(1).max(5).default(5),
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "অভিমত",
      fields: [
        { name: "name", label: "নাম", type: "text", required: true },
        {
          name: "rating",
          label: "রেটিং (১–৫)",
          type: "select",
          options: [5, 4, 3, 2, 1].map((value) => ({
            value: String(value),
            label: String(value),
          })),
        },
        { name: "course", label: "কোর্স", type: "text", latin: true },
        { name: "batch", label: "ব্যাচ", type: "text", latin: true },
        { name: "text", label: "মন্তব্য", type: "textarea", required: true },
        { name: "photo", label: "ছবি", type: "image" },
        sortOrderField,
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    name: str(row.name),
    course: str(row.course),
    batch: str(row.batch),
    text: str(row.text),
    photo: str(row.photo),
    rating: toInt(row.rating, 5),
    sortOrder: toInt(row.sortOrder),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    name: str(values.name),
    course: nullable(values.course),
    batch: nullable(values.batch),
    text: str(values.text),
    photo: nullable(values.photo),
    rating: toInt(values.rating, 5),
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

const faqResource: ResourceConfig = {
  key: "faq",
  model: "faq",
  title: "সাধারণ প্রশ্ন",
  singular: "প্রশ্ন",
  description:
    "কোর্স বাছাই করলে প্রশ্নটি শুধু সেই কোর্সের পেজে দেখাবে; ফাঁকা রাখলে সব জায়গায়।",
  newLabel: "নতুন প্রশ্ন",
  columns: [
    { key: "questionBn", label: "প্রশ্ন" },
    { key: "course", label: "কোর্স", path: "course.nameEn", hideOnMobile: true },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
  ],
  searchFields: ["questionBn", "questionEn"],
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  include: { course: true },
  loadOptions: async () => ({ courses: await courseOptions() }),
  schema: z.object({
    questionBn: requiredText,
    questionEn: optionalText,
    answerBn: requiredText,
    answerEn: optionalText,
    courseId: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
  sections: (options) => [
    {
      id: "main",
      label: "প্রশ্ন",
      fields: [
        {
          name: "questionBn",
          label: "প্রশ্ন (বাংলা)",
          type: "text",
          required: true,
          lang: "bn",
          full: true,
        },
        { name: "answerBn", label: "উত্তর (বাংলা)", type: "richtext", lang: "bn" },
        {
          name: "questionEn",
          label: "Question (English)",
          type: "text",
          lang: "en",
          full: true,
        },
        { name: "answerEn", label: "Answer (English)", type: "richtext", lang: "en" },
        {
          name: "courseId",
          label: "কোর্স (ঐচ্ছিক)",
          type: "select",
          options: options.courses ?? [],
        },
        sortOrderField,
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    questionBn: str(row.questionBn),
    questionEn: str(row.questionEn),
    answerBn: str(row.answerBn),
    answerEn: str(row.answerEn),
    courseId: str(row.courseId),
    sortOrder: toInt(row.sortOrder),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    questionBn: str(values.questionBn),
    questionEn: nullable(values.questionEn),
    answerBn: str(values.answerBn),
    answerEn: nullable(values.answerEn),
    courseId: nullable(values.courseId),
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

const partnerResource: ResourceConfig = {
  key: "partners",
  model: "partner",
  title: "অনুমোদন ও সহযোগী",
  singular: "প্রতিষ্ঠান",
  newLabel: "নতুন প্রতিষ্ঠান",
  columns: [
    { key: "logo", label: "", type: "image" },
    { key: "name", label: "নাম" },
    {
      key: "type",
      label: "ধরন",
      type: "badge",
      labels: { AFFILIATION: "অনুমোদন", COLLABORATION: "সহযোগিতা" },
      hideOnMobile: true,
    },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
  ],
  searchFields: ["name"],
  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  schema: z.object({
    name: requiredText,
    type: z.enum(["AFFILIATION", "COLLABORATION"]),
    logo: optionalText,
    description: optionalText,
    url: optionalText,
    sortOrder: z.coerce.number().int().default(0),
  }),
  sections: () => [
    {
      id: "main",
      label: "প্রতিষ্ঠান",
      fields: [
        { name: "name", label: "নাম", type: "text", required: true, full: true },
        {
          name: "type",
          label: "ধরন",
          type: "select",
          required: true,
          options: [
            { value: "AFFILIATION", label: "অনুমোদন (Affiliation)" },
            { value: "COLLABORATION", label: "সহযোগিতা (Collaboration)" },
          ],
        },
        { name: "url", label: "ওয়েবসাইট", type: "text", latin: true },
        { name: "description", label: "সংক্ষিপ্ত বিবরণ", type: "textarea" },
        {
          name: "logo",
          label: "লোগো",
          type: "image",
          hint: "লোগো না দিলে নামের আদ্যক্ষর দেখানো হবে।",
        },
        sortOrderField,
      ],
    },
  ],
  toForm: (row) => ({
    name: str(row.name),
    type: str(row.type) || "AFFILIATION",
    logo: str(row.logo),
    description: str(row.description),
    url: str(row.url),
    sortOrder: toInt(row.sortOrder),
  }),
  toData: (values) => ({
    name: str(values.name),
    type: str(values.type) || "AFFILIATION",
    logo: nullable(values.logo),
    description: nullable(values.description),
    url: nullable(values.url),
    sortOrder: toInt(values.sortOrder),
  }),
};

const bannerResource: ResourceConfig = {
  key: "banners",
  model: "banner",
  title: "হিরো ব্যানার (স্লাইডার)",
  singular: "ব্যানার",
  description:
    "সক্রিয় ব্যানার থাকলে হোমপেজের ওপরে পুরো প্রস্থের স্লাইডার দেখায় (সর্বোচ্চ ৫টি)। ডেস্কটপ ছবি ১৯২০×৭০০, মোবাইল ছবি ১০৮০×১০৮০ হলে ভালো। ছবি না দিলে ব্র্যান্ড রঙের স্লাইড হয়। গতি ও ডট/তীর সাইট সেটিংস → হিরো স্লাইডার ট্যাবে।",
  newLabel: "নতুন ব্যানার",
  permission: "banners.manage",
  columns: [
    { key: "image", label: "", type: "image" },
    { key: "titleBn", label: "শিরোনাম" },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
    { key: "startAt", label: "শুরু", type: "date", hideOnMobile: true },
    { key: "endAt", label: "শেষ", type: "date", hideOnMobile: true },
    { key: "active", label: "সক্রিয়", type: "bool" },
  ],
  searchFields: ["title", "titleBn", "subtitle", "subtitleBn"],
  orderBy: [{ sortOrder: "asc" }],
  schema: z.object({
    titleBn: optionalText,
    subtitleBn: optionalText,
    title: optionalText,
    subtitle: optionalText,
    image: optionalText,
    mobileImage: optionalText,
    ctaLabelBn: optionalText,
    ctaLabelEn: optionalText,
    ctaLink: optionalText,
    cta2LabelBn: optionalText,
    cta2LabelEn: optionalText,
    cta2Link: optionalText,
    overlay: z.coerce.number().int().min(0).max(80).default(40),
    textPosition: z.enum(["LEFT", "CENTER"]).default("LEFT"),
    startAt: optionalText,
    endAt: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    active: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "ব্যানার",
      fields: [
        {
          name: "titleBn",
          label: "শিরোনাম (বাংলা)",
          type: "text",
          lang: "bn",
          full: true,
        },
        {
          name: "subtitleBn",
          label: "উপশিরোনাম (বাংলা)",
          type: "text",
          lang: "bn",
          full: true,
        },
        {
          name: "ctaLabelBn",
          label: "বোতাম ১ লেখা (বাংলা)",
          type: "text",
          lang: "bn",
          placeholder: "এখনই আবেদন করুন",
        },
        {
          name: "cta2LabelBn",
          label: "বোতাম ২ লেখা (বাংলা)",
          type: "text",
          lang: "bn",
          placeholder: "WhatsApp করুন",
        },
        {
          name: "title",
          label: "Title (English)",
          type: "text",
          lang: "en",
          latin: true,
          full: true,
        },
        {
          name: "subtitle",
          label: "Subtitle (English)",
          type: "text",
          lang: "en",
          latin: true,
          full: true,
        },
        {
          name: "ctaLabelEn",
          label: "Button 1 label (English)",
          type: "text",
          lang: "en",
          latin: true,
        },
        {
          name: "cta2LabelEn",
          label: "Button 2 label (English)",
          type: "text",
          lang: "en",
          latin: true,
        },
        {
          name: "image",
          label: "ডেস্কটপ ছবি (১৯২০×৭০০)",
          type: "image",
          hint: "ফাঁকা রাখলে নেভি গ্রেডিয়েন্টের ওপর লেখা দেখাবে।",
        },
        { name: "mobileImage", label: "মোবাইল ছবি (১০৮০×১০৮০, ঐচ্ছিক)", type: "image" },
        {
          name: "ctaLink",
          label: "বোতাম ১ লিংক",
          type: "text",
          latin: true,
          placeholder: "/apply",
          hint: "লেখা ফাঁকা রাখলে ডিফল্ট “এখনই আবেদন করুন” → /apply।",
        },
        {
          name: "cta2Link",
          label: "বোতাম ২ লিংক",
          type: "text",
          latin: true,
          placeholder: "whatsapp",
          hint: "“whatsapp” লিখলে সাইট সেটিংসের WhatsApp নম্বরে লিংক হবে। লেখা ফাঁকা রাখলে ডিফল্ট WhatsApp বোতাম।",
        },
        {
          name: "overlay",
          label: "কালো ওভারলে (০–৮০%)",
          type: "number",
          hint: "ছবির ওপর লেখা পড়তে যতটা অন্ধকার দরকার। ৪০ সাধারণত ভালো।",
        },
        {
          name: "textPosition",
          label: "লেখার অবস্থান",
          type: "select",
          options: [
            { value: "LEFT", label: "বাম" },
            { value: "CENTER", label: "মাঝখানে" },
          ],
        },
        { name: "startAt", label: "দেখানো শুরু (ঐচ্ছিক)", type: "date" },
        { name: "endAt", label: "দেখানো শেষ (ঐচ্ছিক)", type: "date" },
        sortOrderField,
        { name: "active", label: "সক্রিয়", type: "checkbox" },
      ],
    },
  ],
  toForm: (row) => ({
    titleBn: str(row.titleBn),
    subtitleBn: str(row.subtitleBn),
    title: str(row.title),
    subtitle: str(row.subtitle),
    image: str(row.image),
    mobileImage: str(row.mobileImage),
    ctaLabelBn: str(row.ctaLabelBn),
    ctaLabelEn: str(row.ctaLabelEn),
    ctaLink: str(row.ctaLink),
    cta2LabelBn: str(row.cta2LabelBn),
    cta2LabelEn: str(row.cta2LabelEn),
    cta2Link: str(row.cta2Link),
    overlay: row.overlay == null ? 40 : toInt(row.overlay, 40),
    textPosition: str(row.textPosition) || "LEFT",
    startAt: fromDate(row.startAt),
    endAt: fromDate(row.endAt),
    sortOrder: toInt(row.sortOrder),
    active: row.active === undefined ? true : Boolean(row.active),
  }),
  toData: (values) => ({
    titleBn: nullable(values.titleBn),
    subtitleBn: nullable(values.subtitleBn),
    title: nullable(values.title),
    subtitle: nullable(values.subtitle),
    image: str(values.image),
    mobileImage: nullable(values.mobileImage),
    ctaLabelBn: nullable(values.ctaLabelBn),
    ctaLabelEn: nullable(values.ctaLabelEn),
    ctaLink: nullable(values.ctaLink),
    cta2LabelBn: nullable(values.cta2LabelBn),
    cta2LabelEn: nullable(values.cta2LabelEn),
    cta2Link: nullable(values.cta2Link),
    overlay: toInt(values.overlay, 40),
    textPosition: str(values.textPosition) || "LEFT",
    startAt: toDate(values.startAt),
    endAt: toDate(values.endAt),
    sortOrder: toInt(values.sortOrder),
    active: Boolean(values.active),
  }),
};

const downloadResource: ResourceConfig = {
  key: "downloads",
  model: "download",
  title: "ডাউনলোড",
  singular: "ফাইল",
  description: "ভর্তি ফরম, রুটিন ও প্রসপেক্টাসের PDF এখানে যোগ করুন।",
  newLabel: "নতুন ফাইল",
  columns: [
    { key: "title", label: "শিরোনাম" },
    { key: "category", label: "বিভাগ", hideOnMobile: true },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
  ],
  searchFields: ["title", "category"],
  orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  schema: z.object({
    title: requiredText,
    fileUrl: requiredText,
    category: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "ফাইল",
      fields: [
        { name: "title", label: "শিরোনাম", type: "text", required: true, full: true },
        { name: "fileUrl", label: "ফাইল", type: "file", required: true },
        {
          name: "category",
          label: "বিভাগ",
          type: "text",
          hint: "যেমন: ভর্তি ফরম, রুটিন, প্রসপেক্টাস",
        },
        sortOrderField,
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    title: str(row.title),
    fileUrl: str(row.fileUrl),
    category: str(row.category),
    sortOrder: toInt(row.sortOrder),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    title: str(values.title),
    fileUrl: str(values.fileUrl),
    category: nullable(values.category),
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

const postResource: ResourceConfig = {
  key: "blog",
  model: "post",
  title: "ব্লগ",
  singular: "লেখা",
  newLabel: "নতুন লেখা",
  columns: [
    { key: "cover", label: "", type: "image" },
    { key: "titleBn", label: "শিরোনাম" },
    { key: "publishedAt", label: "প্রকাশ", type: "date", hideOnMobile: true },
  ],
  searchFields: ["titleBn", "titleEn", "slug"],
  orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  schema: z.object({
    titleBn: requiredText,
    titleEn: optionalText,
    slug: optionalText,
    excerpt: optionalText,
    bodyBn: requiredText,
    bodyEn: optionalText,
    cover: optionalText,
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    published: z.boolean().default(false),
    publishedAt: optionalText,
  }),
  sections: () => [
    {
      id: "main",
      label: "লেখা",
      fields: [
        {
          name: "titleBn",
          label: "শিরোনাম (বাংলা)",
          type: "text",
          required: true,
          lang: "bn",
          full: true,
        },
        { name: "bodyBn", label: "লেখা (বাংলা)", type: "richtext", lang: "bn" },
        {
          name: "titleEn",
          label: "Title (English)",
          type: "text",
          lang: "en",
          full: true,
        },
        { name: "bodyEn", label: "Body (English)", type: "richtext", lang: "en" },
        { name: "excerpt", label: "সংক্ষিপ্তসার", type: "textarea" },
        { name: "cover", label: "কভার ছবি", type: "image" },
        {
          name: "slug",
          label: "URL slug",
          type: "text",
          latin: true,
          hint: "ফাঁকা রাখলে শিরোনাম থেকে তৈরি হবে।",
        },
        { name: "tags", label: "ট্যাগ", type: "tags" },
        { name: "publishedAt", label: "প্রকাশের তারিখ", type: "date" },
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    titleBn: str(row.titleBn),
    titleEn: str(row.titleEn),
    slug: str(row.slug),
    excerpt: str(row.excerpt),
    bodyBn: str(row.bodyBn),
    bodyEn: str(row.bodyEn),
    cover: str(row.cover),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    published: Boolean(row.published),
    publishedAt: fromDate(row.publishedAt),
  }),
  toData: (values) => {
    const published = Boolean(values.published);
    const explicitDate = toDate(values.publishedAt);
    return {
      titleBn: str(values.titleBn),
      titleEn: nullable(values.titleEn),
      slug: slugify(str(values.slug) || str(values.titleEn) || str(values.titleBn)),
      excerpt: nullable(values.excerpt),
      bodyBn: str(values.bodyBn),
      bodyEn: nullable(values.bodyEn),
      cover: nullable(values.cover),
      tags: Array.isArray(values.tags)
        ? (values.tags as string[])
        : str(values.tags)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
      published,
      // Publishing without a date stamps "now"; a draft keeps no date.
      publishedAt: explicitDate ?? (published ? new Date() : null),
    };
  },
};

const pageResource: ResourceConfig = {
  key: "pages",
  model: "page",
  title: "পেজ",
  singular: "পেজ",
  description:
    "about-story, privacy ও terms পেজের লেখা এখান থেকে সম্পাদনা করুন। slug পরিবর্তন করলে ওয়েবসাইটের লিংক ভেঙে যেতে পারে।",
  newLabel: "নতুন পেজ",
  columns: [
    { key: "titleBn", label: "শিরোনাম" },
    { key: "slug", label: "slug", hideOnMobile: true },
  ],
  searchFields: ["titleBn", "titleEn", "slug"],
  orderBy: [{ slug: "asc" }],
  schema: z.object({
    slug: requiredText,
    titleBn: requiredText,
    titleEn: optionalText,
    bodyBn: requiredText,
    bodyEn: optionalText,
    published: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "পেজ",
      fields: [
        {
          name: "titleBn",
          label: "শিরোনাম (বাংলা)",
          type: "text",
          required: true,
          lang: "bn",
          full: true,
        },
        { name: "bodyBn", label: "লেখা (বাংলা)", type: "richtext", lang: "bn" },
        {
          name: "titleEn",
          label: "Title (English)",
          type: "text",
          lang: "en",
          full: true,
        },
        { name: "bodyEn", label: "Body (English)", type: "richtext", lang: "en" },
        {
          name: "slug",
          label: "URL slug",
          type: "text",
          required: true,
          latin: true,
        },
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    slug: str(row.slug),
    titleBn: str(row.titleBn),
    titleEn: str(row.titleEn),
    bodyBn: str(row.bodyBn),
    bodyEn: str(row.bodyEn),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    slug: slugify(str(values.slug)),
    titleBn: str(values.titleBn),
    titleEn: nullable(values.titleEn),
    bodyBn: str(values.bodyBn),
    bodyEn: nullable(values.bodyEn),
    published: Boolean(values.published),
  }),
};

const batchResource: ResourceConfig = {
  key: "batches",
  model: "batch",
  title: "ব্যাচ",
  singular: "ব্যাচ",
  description: "হোমপেজে দেখানো হয় সবচেয়ে কাছের “UPCOMING” প্রকাশিত ব্যাচটি।",
  newLabel: "নতুন ব্যাচ",
  rowTool: "batch-clone",
  columns: [
    { key: "name", label: "ব্যাচ" },
    { key: "course", label: "কোর্স", path: "course.nameEn", hideOnMobile: true },
    {
      key: "status",
      label: "অবস্থা",
      type: "badge",
      labels: { UPCOMING: "আসন্ন", RUNNING: "চলমান", COMPLETED: "সম্পন্ন" },
    },
    { key: "startDate", label: "শুরু", type: "date", hideOnMobile: true },
    { key: "seats", label: "আসন", type: "number", hideOnMobile: true },
    { key: "seatsFilled", label: "পূর্ণ", type: "number", hideOnMobile: true },
  ],
  searchFields: ["name"],
  orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  include: { course: true },
  loadOptions: async () => ({ courses: await courseOptions() }),
  schema: z.object({
    name: requiredText,
    courseId: requiredText,
    startDate: optionalText,
    endDate: optionalText,
    status: z.enum(["UPCOMING", "RUNNING", "COMPLETED"]),
    seats: optionalText.or(z.number()),
    seatsFilled: optionalText.or(z.number()),
    showSeatCounter: z.boolean().default(true),
    classDays: optionalText,
    classTime: optionalText,
    note: optionalText,
    published: z.boolean().default(true),
  }),
  sections: (options) => [
    {
      id: "main",
      label: "ব্যাচ",
      fields: [
        {
          name: "name",
          label: "ব্যাচের নাম",
          type: "text",
          required: true,
          full: true,
          placeholder: "DMU Batch, Session 2026",
        },
        {
          name: "courseId",
          label: "কোর্স",
          type: "select",
          required: true,
          options: options.courses ?? [],
        },
        {
          name: "status",
          label: "অবস্থা",
          type: "select",
          required: true,
          options: [
            { value: "UPCOMING", label: "আসন্ন" },
            { value: "RUNNING", label: "চলমান" },
            { value: "COMPLETED", label: "সম্পন্ন" },
          ],
        },
        { name: "startDate", label: "শুরুর তারিখ", type: "date" },
        { name: "endDate", label: "শেষের তারিখ", type: "date" },
        {
          name: "seats",
          label: "মোট আসন",
          type: "number",
          hint: "ফাঁকা রাখলে ওয়েবসাইটে সিট কাউন্টার দেখাবে না।",
        },
        {
          name: "seatsFilled",
          label: "পূর্ণ আসন",
          type: "number",
          hint: "ভর্তি নিশ্চিত হলে নিজে থেকেই বাড়ে। এখানে হাতে লিখলে সেটিই চূড়ান্ত ধরা হবে, স্বয়ংক্রিয় গণনা আর হবে না।",
        },
        {
          name: "showSeatCounter",
          label: "ওয়েবসাইটে “সিট বাকি” দেখান",
          type: "checkbox",
        },
        {
          name: "classDays",
          label: "ক্লাসের দিন",
          type: "text",
          placeholder: "শুক্র ও শনিবার",
        },
        {
          name: "classTime",
          label: "ক্লাসের সময়",
          type: "text",
          placeholder: "সকাল ১০টা – দুপুর ২টা",
        },
        { name: "note", label: "নোট", type: "textarea" },
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    name: str(row.name),
    courseId: str(row.courseId),
    startDate: fromDate(row.startDate),
    endDate: fromDate(row.endDate),
    status: str(row.status) || "UPCOMING",
    seats: row.seats == null ? "" : toInt(row.seats),
    seatsFilled: row.seatsFilled == null ? 0 : toInt(row.seatsFilled),
    showSeatCounter:
      row.showSeatCounter === undefined ? true : Boolean(row.showSeatCounter),
    classDays: str(row.classDays),
    classTime: str(row.classTime),
    note: str(row.note),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    name: str(values.name),
    courseId: str(values.courseId),
    startDate: toDate(values.startDate),
    endDate: toDate(values.endDate),
    status: str(values.status) || "UPCOMING",
    seats: optionalInt(values.seats),
    seatsFilled: toInt(values.seatsFilled),
    showSeatCounter: Boolean(values.showSeatCounter),
    classDays: nullable(values.classDays),
    classTime: nullable(values.classTime),
    note: nullable(values.note),
    published: Boolean(values.published),
  }),
  /**
   * A hand-typed seat count switches the batch to manual mode, so the
   * automatic increments stop overwriting the office's own number
   * (addendum 2, A1).
   */
  beforeWrite: (data, existing) => {
    if (!existing) return data;
    const changed = toInt(data.seatsFilled) !== toInt(existing.seatsFilled);
    return changed ? { ...data, seatsFilledManual: true } : data;
  },
  afterWrite: async () => {
    const { revalidateBatches } = await import("@/lib/admin/seats");
    revalidateBatches();
  },
};

const resultResource: ResourceConfig = {
  key: "results",
  model: "result",
  title: "ফলাফল",
  singular: "ফলাফল",
  description: "PDF সংযুক্ত করুন অথবা টেবিল আকারে ফলাফল লিখুন।",
  newLabel: "নতুন ফলাফল",
  columns: [
    { key: "title", label: "শিরোনাম" },
    { key: "course", label: "কোর্স", path: "course.nameEn", hideOnMobile: true },
    { key: "batch", label: "ব্যাচ", path: "batch.name", hideOnMobile: true },
    { key: "examDate", label: "পরীক্ষা", type: "date", hideOnMobile: true },
  ],
  searchFields: ["title"],
  orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
  include: { batch: true, course: true },
  loadOptions: async () => ({
    courses: await courseOptions(),
    batches: await batchOptions(),
  }),
  schema: z.object({
    title: requiredText,
    courseId: optionalText,
    batchId: optionalText,
    examDate: optionalText,
    fileUrl: optionalText,
    bodyHtml: optionalText,
    published: z.boolean().default(false),
  }),
  sections: (options) => [
    {
      id: "main",
      label: "ফলাফল",
      fields: [
        { name: "title", label: "শিরোনাম", type: "text", required: true, full: true },
        {
          name: "courseId",
          label: "কোর্স",
          type: "select",
          options: options.courses ?? [],
        },
        {
          name: "batchId",
          label: "ব্যাচ",
          type: "select",
          options: options.batches ?? [],
        },
        { name: "examDate", label: "পরীক্ষার তারিখ", type: "date" },
        { name: "fileUrl", label: "PDF ফাইল", type: "file" },
        { name: "bodyHtml", label: "ফলাফল টেবিল / বিবরণ", type: "richtext" },
        publishedField,
      ],
    },
  ],
  toForm: (row) => ({
    title: str(row.title),
    courseId: str(row.courseId),
    batchId: str(row.batchId),
    examDate: fromDate(row.examDate),
    fileUrl: str(row.fileUrl),
    bodyHtml: str(row.bodyHtml),
    published: Boolean(row.published),
  }),
  toData: (values) => ({
    title: str(values.title),
    courseId: nullable(values.courseId),
    batchId: nullable(values.batchId),
    examDate: toDate(values.examDate),
    fileUrl: nullable(values.fileUrl),
    bodyHtml: nullable(values.bodyHtml),
    published: Boolean(values.published),
  }),
};

const studentResource: ResourceConfig = {
  key: "students",
  model: "student",
  title: "শিক্ষার্থী",
  singular: "শিক্ষার্থী",
  description:
    "“যাচাইযোগ্য” চালু করলে শিক্ষার্থীর সনদ পাবলিক /verify পেজে যাচাই করা যাবে।",
  newLabel: "নতুন শিক্ষার্থী",
  columns: [
    { key: "roll", label: "রোল" },
    { key: "name", label: "নাম" },
    { key: "course", label: "কোর্স", path: "course.nameEn", hideOnMobile: true },
    { key: "batch", label: "ব্যাচ", path: "batch.name", hideOnMobile: true },
    {
      key: "status",
      label: "অবস্থা",
      type: "badge",
      labels: { ACTIVE: "চলমান", COMPLETED: "সম্পন্ন", DROPPED: "বাদ" },
    },
    { key: "verifiable", label: "যাচাইযোগ্য", type: "bool", hideOnMobile: true },
  ],
  searchFields: ["roll", "certificateNo", "name", "phone", "bmdc", "boardRoll"],
  orderBy: [{ createdAt: "desc" }],
  include: { course: true, batch: true },
  importEntity: "students",
  exportCsv: true,
  detailPanel: "student-certificates",
  loadOptions: async () => ({
    courses: await courseOptions(),
    batches: await batchOptions(),
  }),
  schema: z.object({
    roll: requiredText,
    certificateNo: optionalText,
    name: requiredText,
    nameBn: optionalText,
    phone: optionalText,
    email: optionalText,
    gender: optionalText,
    dateOfBirth: optionalText,
    fatherName: optionalText,
    motherName: optionalText,
    nid: optionalText,
    bmdc: optionalText,
    address: optionalText,
    boardRoll: optionalText,
    boardRegistrationNo: optionalText,
    courseId: requiredText,
    batchId: optionalText,
    admissionDate: optionalText,
    completionDate: optionalText,
    status: z.enum(["ACTIVE", "COMPLETED", "DROPPED"]),
    resultGrade: optionalText,
    verifiable: z.boolean().default(false),
    note: optionalText,
  }),
  sections: (options) => [
    {
      id: "main",
      label: "শিক্ষার্থী",
      fields: [
        { name: "name", label: "নাম (English)", type: "text", required: true },
        { name: "nameBn", label: "নাম (বাংলা)", type: "text" },
        { name: "roll", label: "রোল", type: "text", required: true, latin: true },
        {
          name: "certificateNo",
          label: "সার্টিফিকেট নম্বর (পুরনো ঘর)",
          type: "text",
          latin: true,
          hint: "সনদ এখন “সার্টিফিকেট” মেনু থেকে দেওয়া হয়; এই ঘরটি পুরনো রেকর্ডের জন্য।",
        },
        { name: "phone", label: "মোবাইল", type: "text", latin: true },
        { name: "email", label: "ইমেইল", type: "text", latin: true },
        { name: "bmdc", label: "BMDC নম্বর", type: "text", latin: true },
        {
          name: "gender",
          label: "লিঙ্গ",
          type: "select",
          options: [
            { value: "MALE", label: "পুরুষ" },
            { value: "FEMALE", label: "নারী" },
            { value: "OTHER", label: "অন্যান্য" },
          ],
        },
        { name: "dateOfBirth", label: "জন্মতারিখ", type: "date" },
        { name: "fatherName", label: "পিতার নাম", type: "text" },
        { name: "motherName", label: "মাতার নাম", type: "text" },
        { name: "nid", label: "NID", type: "text", latin: true },
        { name: "address", label: "ঠিকানা", type: "textarea" },
        {
          name: "boardRoll",
          label: "বোর্ড রোল (BTEB)",
          type: "text",
          latin: true,
          hint: "১০ সংখ্যার বোর্ড রোল; ফলাফল এই রোলে স্বয়ংক্রিয়ভাবে লিংক হয়।",
        },
        {
          name: "boardRegistrationNo",
          label: "বোর্ড রেজিস্ট্রেশন নম্বর",
          type: "text",
          latin: true,
        },
        {
          name: "courseId",
          label: "কোর্স",
          type: "select",
          required: true,
          options: options.courses ?? [],
        },
        {
          name: "batchId",
          label: "ব্যাচ",
          type: "select",
          options: options.batches ?? [],
        },
        {
          name: "status",
          label: "অবস্থা",
          type: "select",
          required: true,
          options: [
            { value: "ACTIVE", label: "চলমান" },
            { value: "COMPLETED", label: "সম্পন্ন" },
            { value: "DROPPED", label: "বাদ" },
          ],
        },
        { name: "admissionDate", label: "ভর্তির তারিখ", type: "date" },
        { name: "completionDate", label: "সমাপ্তির তারিখ", type: "date" },
        { name: "resultGrade", label: "গ্রেড", type: "text", latin: true },
        { name: "note", label: "নোট", type: "textarea" },
        {
          name: "verifiable",
          label: "যাচাইযোগ্য (পাবলিক /verify পেজে দেখাবে)",
          type: "checkbox",
        },
      ],
    },
  ],
  toForm: (row) => ({
    roll: str(row.roll),
    certificateNo: str(row.certificateNo),
    name: str(row.name),
    nameBn: str(row.nameBn),
    phone: str(row.phone),
    email: str(row.email),
    gender: str(row.gender),
    dateOfBirth: fromDate(row.dateOfBirth),
    fatherName: str(row.fatherName),
    motherName: str(row.motherName),
    nid: str(row.nid),
    bmdc: str(row.bmdc),
    address: str(row.address),
    boardRoll: str(row.boardRoll),
    boardRegistrationNo: str(row.boardRegistrationNo),
    courseId: str(row.courseId),
    batchId: str(row.batchId),
    admissionDate: fromDate(row.admissionDate),
    completionDate: fromDate(row.completionDate),
    status: str(row.status) || "ACTIVE",
    resultGrade: str(row.resultGrade),
    verifiable: Boolean(row.verifiable),
    note: str(row.note),
  }),
  toData: (values) => ({
    roll: str(values.roll),
    certificateNo: nullable(values.certificateNo),
    name: str(values.name),
    nameBn: nullable(values.nameBn),
    phone: nullable(values.phone),
    email: nullable(values.email),
    gender: nullable(values.gender),
    dateOfBirth: toDate(values.dateOfBirth),
    fatherName: nullable(values.fatherName),
    motherName: nullable(values.motherName),
    nid: nullable(values.nid),
    bmdc: nullable(values.bmdc),
    bmdcNormalized: nullable(values.bmdc) ? normalizeBmdc(str(values.bmdc)) : null,
    address: nullable(values.address),
    boardRoll: nullable(values.boardRoll),
    boardRegistrationNo: nullable(values.boardRegistrationNo),
    courseId: str(values.courseId),
    batchId: nullable(values.batchId),
    admissionDate: toDate(values.admissionDate),
    completionDate: toDate(values.completionDate),
    status: str(values.status) || "ACTIVE",
    resultGrade: nullable(values.resultGrade),
    verifiable: Boolean(values.verifiable),
    note: nullable(values.note),
  }),
  /**
   * A new student in a batch takes a seat; moving an existing student between
   * batches moves the seat with them (addendum 2, A1).
   */
  afterWrite: async (_row, data, existing) => {
    const { bumpSeatsFilled } = await import("@/lib/admin/seats");
    const next = typeof data.batchId === "string" ? data.batchId : null;
    const previous =
      existing && typeof existing.batchId === "string" ? existing.batchId : null;

    if (next === previous) return;
    if (previous) await bumpSeatsFilled(previous, -1);
    if (next) await bumpSeatsFilled(next, 1);
  },
};

/* -------------------------------------------------------------------------- */
/* Editable content lists (one ContentItem table, six admin screens)          */
/* -------------------------------------------------------------------------- */

/** Icons an admin can choose for a "why choose MUTI" card. */
const WHY_ICON_OPTIONS: OptionList = [
  { value: "ShieldCheck", label: "ঢাল ✓ (সরকার অনুমোদিত)" },
  { value: "Stethoscope", label: "স্টেথোস্কোপ (প্র্যাকটিক্যাল)" },
  { value: "GraduationCap", label: "গ্র্যাজুয়েশন ক্যাপ (শিক্ষক)" },
  { value: "MonitorSmartphone", label: "মেশিন / ডিভাইস" },
  { value: "Gift", label: "উপহার (ফ্রি ক্লাস)" },
  { value: "Infinity", label: "অসীম (আজীবন সুবিধা)" },
  { value: "Users", label: "মানুষ (মেন্টরশিপ)" },
  { value: "UsersRound", label: "দল (গ্রুপ ছাড়)" },
  { value: "Award", label: "পদক (সার্টিফিকেট)" },
  { value: "CreditCard", label: "কার্ড (কিস্তি)" },
  { value: "BadgeCheck", label: "ব্যাজ ✓" },
  { value: "BookOpen", label: "বই" },
  { value: "Clock", label: "ঘড়ি" },
  { value: "HeartHandshake", label: "হাত মেলানো" },
  { value: "Sparkles", label: "ঝিলিক" },
  { value: "Trophy", label: "ট্রফি" },
];

/**
 * Builds one of the six content editors. They differ only in which fields are
 * shown, so the shape is generated rather than repeated six times.
 */
function contentResource(options: {
  key: string;
  kind: string;
  title: string;
  singular: string;
  newLabel: string;
  description: string;
  withTitle?: boolean;
  withIcon?: boolean;
  bodyLabelBn: string;
  bodyLabelEn: string;
}): ResourceConfig {
  const {
    key,
    kind,
    title,
    singular,
    newLabel,
    description,
    withTitle = false,
    withIcon = false,
    bodyLabelBn,
    bodyLabelEn,
  } = options;

  return {
    key,
    model: "contentItem",
    title,
    singular,
    description,
    newLabel,
    baseWhere: { kind },
    columns: [
      ...(withTitle ? [{ key: "titleBn", label: "শিরোনাম" } as ResourceColumn] : []),
      { key: "bodyBn", label: "লেখা" },
      { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
    ],
    searchFields: ["bodyBn", "bodyEn", "titleBn", "titleEn"],
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    schema: z.object({
      titleBn: optionalText,
      titleEn: optionalText,
      bodyBn: requiredText,
      bodyEn: optionalText,
      icon: optionalText,
      sortOrder: z.coerce.number().int().default(0),
      published: z.boolean().default(true),
    }),
    sections: () => [
      {
        id: "main",
        label: singular,
        fields: [
          ...(withTitle
            ? [
                {
                  name: "titleBn",
                  label: "শিরোনাম (বাংলা)",
                  type: "text" as const,
                  required: true,
                  lang: "bn" as const,
                  full: true,
                },
              ]
            : []),
          {
            name: "bodyBn",
            label: bodyLabelBn,
            type: "textarea",
            required: true,
            lang: "bn",
          },
          ...(withTitle
            ? [
                {
                  name: "titleEn",
                  label: "Title (English)",
                  type: "text" as const,
                  lang: "en" as const,
                  full: true,
                },
              ]
            : []),
          { name: "bodyEn", label: bodyLabelEn, type: "textarea", lang: "en" },
          ...(withIcon
            ? [
                {
                  name: "icon",
                  label: "আইকন",
                  type: "select" as const,
                  options: WHY_ICON_OPTIONS,
                  hint: "না বাছাই করলে একটি টিক চিহ্ন দেখানো হবে।",
                },
              ]
            : []),
          sortOrderField,
          publishedField,
        ],
      },
    ],
    toForm: (row) => ({
      titleBn: str(row.titleBn),
      titleEn: str(row.titleEn),
      bodyBn: str(row.bodyBn),
      bodyEn: str(row.bodyEn),
      icon: str(row.icon),
      sortOrder: toInt(row.sortOrder),
      published: row.published === undefined ? true : Boolean(row.published),
    }),
    toData: (values) => ({
      kind,
      titleBn: nullable(values.titleBn),
      titleEn: nullable(values.titleEn),
      bodyBn: str(values.bodyBn),
      bodyEn: nullable(values.bodyEn),
      icon: nullable(values.icon),
      sortOrder: toInt(values.sortOrder),
      published: Boolean(values.published),
    }),
  };
}

const whyChooseResource = contentResource({
  key: "why-choose",
  kind: "WHY_CHOOSE",
  title: "কেন MUTI",
  singular: "পয়েন্ট",
  newLabel: "নতুন পয়েন্ট",
  description: "হোমপেজের “কেন MUTI বেছে নেবেন” কার্ডগুলো। প্রথম ৮টি দেখানো হয়।",
  withIcon: true,
  bodyLabelBn: "লেখা (বাংলা)",
  bodyLabelEn: "Text (English)",
});

const documentResource = contentResource({
  key: "documents",
  kind: "DOCUMENT",
  title: "প্রয়োজনীয় কাগজপত্র",
  singular: "কাগজ",
  newLabel: "নতুন কাগজ",
  description:
    "প্রতিটি কোর্স পেজ ও ভর্তি পাতায় দেখানো হয়। সব মুছে ফেললে অংশটি আর দেখাবে না।",
  bodyLabelBn: "কাগজের নাম (বাংলা)",
  bodyLabelEn: "Document (English)",
});

const paymentPolicyResource = contentResource({
  key: "payment-policy",
  kind: "PAYMENT_POLICY",
  title: "পেমেন্ট নীতিমালা",
  singular: "নিয়ম",
  newLabel: "নতুন নিয়ম",
  description: "প্রতিটি কোর্সের ফি কার্ড ও ভর্তি পাতায় দেখানো হয়।",
  bodyLabelBn: "নিয়ম (বাংলা)",
  bodyLabelEn: "Rule (English)",
});

const admissionStepResource = contentResource({
  key: "admission-steps",
  kind: "ADMISSION_STEP",
  title: "ভর্তির ধাপ",
  singular: "ধাপ",
  newLabel: "নতুন ধাপ",
  description: "ভর্তি পাতার ১-২-৩-৪ ধাপ। ক্রম অনুযায়ী নম্বর বসে।",
  withTitle: true,
  bodyLabelBn: "বিবরণ (বাংলা)",
  bodyLabelEn: "Description (English)",
});

const valueResource = contentResource({
  key: "values",
  kind: "VALUE",
  title: "লক্ষ্য ও মূল্যবোধ",
  singular: "কার্ড",
  newLabel: "নতুন কার্ড",
  description: "“আমাদের সম্পর্কে” পাতার তিনটি কার্ড — লক্ষ্য, দৃষ্টিভঙ্গি ও মূল্যবোধ।",
  withTitle: true,
  bodyLabelBn: "বিবরণ (বাংলা)",
  bodyLabelEn: "Description (English)",
});

const certificateTypeResource = contentResource({
  key: "certificate-types",
  kind: "CERTIFICATE",
  title: "প্রদত্ত সার্টিফিকেট",
  singular: "সার্টিফিকেট",
  newLabel: "নতুন সার্টিফিকেট",
  description: "অনুমোদন পাতায় দেখানো সার্টিফিকেটের তালিকা।",
  bodyLabelBn: "সার্টিফিকেটের নাম (বাংলা)",
  bodyLabelEn: "Certificate (English)",
});

/* -------------------------------------------------------------------------- */
/* Addendum 3                                                                 */
/* -------------------------------------------------------------------------- */

async function studentOptions(): Promise<OptionList> {
  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, roll: true, name: true },
    take: 2000,
  });
  return students.map((s) => ({ value: s.id, label: `${s.roll} — ${s.name}` }));
}

/** Issued certificates (addendum 3, §1) — what /verify answers from. */
const issuedCertificateResource: ResourceConfig = {
  key: "certificates",
  model: "certificate",
  title: "সার্টিফিকেট",
  singular: "সার্টিফিকেট",
  description:
    "প্রদান করা সনদের রেজিস্টার। /verify পাতায় সার্টিফিকেট নম্বর বা শিক্ষার্থীর BMDC দিয়ে এগুলোই যাচাই হয়। বাতিল করতে অবস্থা “বাতিল” করে কারণ লিখুন।",
  newLabel: "নতুন সার্টিফিকেট",
  permission: "certificates.manage",
  importEntity: "certificates",
  exportCsv: true,
  baseWhere: { deletedAt: null },
  columns: [
    { key: "certificateNo", label: "নম্বর" },
    { key: "student", label: "শিক্ষার্থী", path: "student.name" },
    { key: "course", label: "কোর্স", path: "course.code", hideOnMobile: true },
    {
      key: "type",
      label: "ধরন",
      type: "badge",
      labels: { COURSE: "কোর্স", SEMESTER: "সেমিস্টার", BOARD: "বোর্ড" },
      hideOnMobile: true,
    },
    { key: "issuedAt", label: "প্রদান", type: "date", hideOnMobile: true },
    {
      key: "status",
      label: "অবস্থা",
      type: "badge",
      labels: { VALID: "বৈধ", REVOKED: "বাতিল" },
    },
  ],
  searchFields: ["certificateNo", "session", "batchName"],
  orderBy: [{ createdAt: "desc" }],
  include: { student: true, course: true },
  loadOptions: async () => ({
    students: await studentOptions(),
    courses: await courseOptions(),
  }),
  schema: z.object({
    certificateNo: requiredText,
    studentId: requiredText,
    courseId: requiredText,
    type: z.enum(["COURSE", "SEMESTER", "BOARD"]).default("COURSE"),
    batchName: optionalText,
    session: optionalText,
    issuedAt: optionalText,
    grade: optionalText,
    status: z.enum(["VALID", "REVOKED"]).default("VALID"),
    revokedReason: optionalText,
    file: optionalText,
  }),
  sections: (options) => [
    {
      id: "main",
      label: "সার্টিফিকেট",
      fields: [
        {
          name: "certificateNo",
          label: "সার্টিফিকেট নম্বর (সনদে যেমন ছাপা)",
          type: "text",
          required: true,
          latin: true,
          placeholder: "MUTI-C-2026-0117",
        },
        {
          name: "studentId",
          label: "শিক্ষার্থী",
          type: "select",
          required: true,
          options: options.students ?? [],
        },
        {
          name: "courseId",
          label: "কোর্স",
          type: "select",
          required: true,
          options: options.courses ?? [],
        },
        {
          name: "type",
          label: "ধরন",
          type: "select",
          required: true,
          options: [
            { value: "COURSE", label: "কোর্স সনদ (MUTI)" },
            { value: "SEMESTER", label: "সেমিস্টার সনদ" },
            {
              value: "BOARD",
              label: "বোর্ড সনদ (BTEB প্রদত্ত, MUTI শুধু রেকর্ড রাখে)",
            },
          ],
        },
        {
          name: "session",
          label: "সেশন",
          type: "text",
          latin: true,
          placeholder: "Jan-June 2025",
        },
        { name: "batchName", label: "ব্যাচ", type: "text", latin: true },
        { name: "issuedAt", label: "প্রদানের তারিখ", type: "date" },
        {
          name: "grade",
          label: "গ্রেড",
          type: "text",
          latin: true,
          placeholder: "4.00",
        },
        {
          name: "status",
          label: "অবস্থা",
          type: "select",
          required: true,
          options: [
            { value: "VALID", label: "বৈধ" },
            { value: "REVOKED", label: "বাতিল" },
          ],
        },
        {
          name: "revokedReason",
          label: "বাতিলের কারণ",
          type: "text",
          hint: "অবস্থা “বাতিল” হলে যাচাই পাতায় এই কারণটি দেখাবে।",
        },
        {
          name: "file",
          label: "স্ক্যান কপি (শুধু অফিসের জন্য, পাবলিকে দেখায় না)",
          type: "file",
        },
      ],
    },
  ],
  toForm: (row) => ({
    certificateNo: str(row.certificateNo),
    studentId: str(row.studentId),
    courseId: str(row.courseId),
    type: str(row.type) || "COURSE",
    batchName: str(row.batchName),
    session: str(row.session),
    issuedAt: fromDate(row.issuedAt),
    grade: str(row.grade),
    status: str(row.status) || "VALID",
    revokedReason: str(row.revokedReason),
    file: str(row.file),
  }),
  toData: (values) => ({
    certificateNo: str(values.certificateNo).replace(/\s+/g, "").toUpperCase(),
    studentId: str(values.studentId),
    courseId: str(values.courseId),
    type: str(values.type) || "COURSE",
    batchName: nullable(values.batchName),
    session: nullable(values.session),
    issuedAt: toDate(values.issuedAt),
    grade: nullable(values.grade),
    status: str(values.status) || "VALID",
    revokedReason:
      str(values.status) === "REVOKED" ? nullable(values.revokedReason) : null,
    file: nullable(values.file),
  }),
};

/** BTEB examinations (addendum 3, §2); rows are edited on their own page. */
const boardExamResource: ResourceConfig = {
  key: "board-exams",
  model: "boardExam",
  title: "বোর্ড পরীক্ষা ও ফলাফল",
  singular: "বোর্ড পরীক্ষা",
  description:
    "BTEB যে পরীক্ষার ফলাফল প্রকাশ করেছে সেটি এখানে যোগ করুন, তারপর “ফলাফল” বোতামে রোলভিত্তিক ফল বসান বা পেস্ট করুন। প্রকাশিত হলে /results পাতায় খোঁজা যাবে।",
  newLabel: "নতুন বোর্ড পরীক্ষা",
  permission: "results.manage",
  rowTool: "board-results",
  columns: [
    { key: "title", label: "পরীক্ষা" },
    { key: "session", label: "সেশন", hideOnMobile: true },
    { key: "publishedOn", label: "প্রকাশ", type: "date", hideOnMobile: true },
    { key: "published", label: "প্রকাশিত", type: "bool" },
  ],
  searchFields: ["title", "session", "memoNo"],
  orderBy: [{ publishedOn: "desc" }, { createdAt: "desc" }],
  loadOptions: async () => ({ courses: await courseOptions() }),
  schema: z.object({
    title: requiredText,
    session: requiredText,
    heldIn: optionalText,
    memoNo: optionalText,
    publishedOn: optionalText,
    courseId: optionalText,
    boardName: optionalText,
    noticeFile: optionalText,
    published: z.boolean().default(false),
  }),
  sections: (options) => [
    {
      id: "main",
      label: "পরীক্ষা",
      fields: [
        {
          name: "title",
          label: "পরীক্ষার নাম",
          type: "text",
          required: true,
          full: true,
          placeholder: "Certificate in Medical Ultrasound Examination 2025",
        },
        {
          name: "session",
          label: "সেশন",
          type: "text",
          required: true,
          latin: true,
          placeholder: "Jan-June 2025",
        },
        {
          name: "heldIn",
          label: "অনুষ্ঠিত",
          type: "text",
          latin: true,
          placeholder: "August 2025",
        },
        { name: "memoNo", label: "স্মারক নম্বর", type: "text", latin: true },
        { name: "publishedOn", label: "প্রকাশের তারিখ", type: "date" },
        {
          name: "courseId",
          label: "কোর্স",
          type: "select",
          options: options.courses ?? [],
        },
        { name: "boardName", label: "বোর্ড", type: "text", latin: true },
        {
          name: "noticeFile",
          label: "বোর্ডের নোটিশ (PDF) — পাবলিকে ডাউনলোড করা যাবে",
          type: "file",
        },
        {
          name: "published",
          label: "প্রকাশিত (/results পাতায় দেখাবে)",
          type: "checkbox",
        },
      ],
    },
  ],
  toForm: (row) => ({
    title: str(row.title),
    session: str(row.session),
    heldIn: str(row.heldIn),
    memoNo: str(row.memoNo),
    publishedOn: fromDate(row.publishedOn),
    courseId: str(row.courseId),
    boardName: str(row.boardName) || "Bangladesh Technical Education Board",
    noticeFile: str(row.noticeFile),
    published: Boolean(row.published),
  }),
  toData: (values) => ({
    title: str(values.title),
    session: str(values.session),
    heldIn: nullable(values.heldIn),
    memoNo: nullable(values.memoNo),
    publishedOn: toDate(values.publishedOn),
    courseId: nullable(values.courseId),
    boardName: str(values.boardName) || "Bangladesh Technical Education Board",
    noticeFile: nullable(values.noticeFile),
    published: Boolean(values.published),
  }),
};

/** Chairman's / MD's message (addendum 3, §4). */
const leadershipResource: ResourceConfig = {
  key: "leadership",
  model: "leadershipMessage",
  title: "নেতৃত্বের বক্তব্য",
  singular: "বক্তব্য",
  description:
    "চেয়ারম্যান, ব্যবস্থাপনা পরিচালক বা অন্য কারও বার্তা। প্রকাশিত হলে হোমপেজে কার্ড ও /messages/<key> পাতা তৈরি হয়; নতুন key দিলেই নতুন পাতা।",
  newLabel: "নতুন বক্তব্য",
  permission: "leadership.manage",
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "personName", label: "নাম" },
    { key: "roleTitleBn", label: "পদ", hideOnMobile: true },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
    { key: "published", label: "প্রকাশিত", type: "bool" },
  ],
  searchFields: ["personName", "personNameBn", "roleTitleBn", "roleTitleEn", "key"],
  orderBy: [{ sortOrder: "asc" }],
  schema: z.object({
    key: requiredText.regex(/^[a-z0-9-]+$/i, "শুধু ইংরেজি অক্ষর, সংখ্যা ও হাইফেন"),
    roleTitleBn: requiredText,
    roleTitleEn: requiredText,
    personName: requiredText,
    personNameBn: optionalText,
    degrees: optionalText,
    designationLine: optionalText,
    photo: optionalText,
    messageBn: requiredText,
    messageEn: optionalText,
    excerptBn: optionalText,
    excerptEn: optionalText,
    signatureImage: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(false),
  }),
  sections: () => [
    {
      id: "main",
      label: "বক্তব্য",
      fields: [
        {
          name: "key",
          label: "URL key",
          type: "text",
          required: true,
          latin: true,
          placeholder: "chairman",
          hint: "পাতার ঠিকানা হবে /messages/<key>। যেমন chairman, managing-director, principal।",
        },
        {
          name: "personName",
          label: "নাম (English)",
          type: "text",
          required: true,
          latin: true,
        },
        {
          name: "roleTitleBn",
          label: "পদবি (বাংলা)",
          type: "text",
          required: true,
          lang: "bn",
        },
        { name: "personNameBn", label: "নাম (বাংলা)", type: "text", lang: "bn" },
        {
          name: "excerptBn",
          label: "সংক্ষিপ্ত উদ্ধৃতি (বাংলা) — হোমপেজ কার্ডে দুই লাইন",
          type: "textarea",
          lang: "bn",
        },
        {
          name: "messageBn",
          label: "পূর্ণ বক্তব্য (বাংলা)",
          type: "richtext",
          lang: "bn",
          required: true,
        },
        {
          name: "roleTitleEn",
          label: "Role title (English)",
          type: "text",
          required: true,
          lang: "en",
          latin: true,
        },
        {
          name: "excerptEn",
          label: "Excerpt (English)",
          type: "textarea",
          lang: "en",
          latin: true,
        },
        {
          name: "messageEn",
          label: "Full message (English)",
          type: "richtext",
          lang: "en",
        },
        {
          name: "degrees",
          label: "ডিগ্রি",
          type: "text",
          latin: true,
          placeholder: "MBBS, DMU",
        },
        {
          name: "designationLine",
          label: "পরিচিতি লাইন",
          type: "text",
          latin: true,
          placeholder: "Sonologist",
        },
        { name: "photo", label: "ছবি", type: "image" },
        { name: "signatureImage", label: "স্বাক্ষরের ছবি", type: "image" },
        sortOrderField,
        { name: "published", label: "প্রকাশিত", type: "checkbox" },
      ],
    },
  ],
  toForm: (row) => ({
    key: str(row.key),
    roleTitleBn: str(row.roleTitleBn),
    roleTitleEn: str(row.roleTitleEn),
    personName: str(row.personName),
    personNameBn: str(row.personNameBn),
    degrees: str(row.degrees),
    designationLine: str(row.designationLine),
    photo: str(row.photo),
    messageBn: str(row.messageBn),
    messageEn: str(row.messageEn),
    excerptBn: str(row.excerptBn),
    excerptEn: str(row.excerptEn),
    signatureImage: str(row.signatureImage),
    sortOrder: toInt(row.sortOrder),
    published: Boolean(row.published),
  }),
  toData: (values) => ({
    key: str(values.key).toLowerCase(),
    roleTitleBn: str(values.roleTitleBn),
    roleTitleEn: str(values.roleTitleEn),
    personName: str(values.personName),
    personNameBn: nullable(values.personNameBn),
    degrees: nullable(values.degrees),
    designationLine: nullable(values.designationLine),
    photo: nullable(values.photo),
    messageBn: str(values.messageBn),
    messageEn: nullable(values.messageEn),
    excerptBn: nullable(values.excerptBn),
    excerptEn: nullable(values.excerptEn),
    signatureImage: nullable(values.signatureImage),
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

/** Advisory board (addendum 3, §5). Categories come from Site Settings. */
const advisorResource: ResourceConfig = {
  key: "advisors",
  model: "advisor",
  title: "উপদেষ্টা মণ্ডলী",
  singular: "উপদেষ্টা",
  description:
    "ক্যাটাগরির তালিকা সাইট সেটিংস → ফলাফল ও যাচাই ট্যাবে সম্পাদনা করা যায়।",
  newLabel: "নতুন উপদেষ্টা",
  permission: "advisors.manage",
  importEntity: "advisors",
  exportCsv: true,
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "name", label: "নাম" },
    { key: "designation", label: "পদবি", hideOnMobile: true },
    { key: "category", label: "ক্যাটাগরি", hideOnMobile: true },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
    { key: "published", label: "প্রকাশিত", type: "bool" },
  ],
  searchFields: ["name", "nameBn", "designation", "organization"],
  orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  loadOptions: async () => {
    const row = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    const json = (row?.json ?? {}) as { advisors?: { categories?: string } };
    const text =
      json.advisors?.categories?.trim() || defaultSiteSettings.advisors.categories;
    return {
      categories: parseAdvisorCategories(text).map((c) => ({
        value: c.key,
        label: `${c.labelBn} (${c.key})`,
      })),
    };
  },
  schema: z.object({
    name: requiredText,
    nameBn: optionalText,
    degrees: optionalText,
    designation: requiredText,
    designationBn: optionalText,
    organization: optionalText,
    bio: optionalText,
    photo: optionalText,
    category: requiredText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
  sections: (options) => [
    {
      id: "main",
      label: "উপদেষ্টা",
      fields: [
        {
          name: "name",
          label: "নাম (English)",
          type: "text",
          required: true,
          latin: true,
        },
        { name: "nameBn", label: "নাম (বাংলা)", type: "text" },
        {
          name: "degrees",
          label: "ডিগ্রি",
          type: "text",
          latin: true,
          placeholder: "MBBS, FCPS",
        },
        {
          name: "designation",
          label: "পদবি (English)",
          type: "text",
          required: true,
          latin: true,
        },
        { name: "designationBn", label: "পদবি (বাংলা)", type: "text" },
        { name: "organization", label: "প্রতিষ্ঠান / হাসপাতাল", type: "text" },
        {
          name: "category",
          label: "ক্যাটাগরি",
          type: "select",
          required: true,
          options: options.categories ?? [],
        },
        { name: "photo", label: "ছবি (বর্গাকার)", type: "image" },
        { name: "bio", label: "সংক্ষিপ্ত পরিচিতি", type: "textarea" },
        sortOrderField,
        { name: "published", label: "প্রকাশিত", type: "checkbox" },
      ],
    },
  ],
  toForm: (row) => ({
    name: str(row.name),
    nameBn: str(row.nameBn),
    degrees: str(row.degrees),
    designation: str(row.designation),
    designationBn: str(row.designationBn),
    organization: str(row.organization),
    bio: str(row.bio),
    photo: str(row.photo),
    category: str(row.category) || "ADVISOR",
    sortOrder: toInt(row.sortOrder),
    published: row.published === undefined ? true : Boolean(row.published),
  }),
  toData: (values) => ({
    name: str(values.name),
    nameBn: nullable(values.nameBn),
    degrees: nullable(values.degrees),
    designation: str(values.designation),
    designationBn: nullable(values.designationBn),
    organization: nullable(values.organization),
    bio: nullable(values.bio),
    photo: nullable(values.photo),
    category: str(values.category).toUpperCase() || "ADVISOR",
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

export const RESOURCES: Record<string, ResourceConfig> = {
  notices: noticeResource,
  faculty: facultyResource,
  testimonials: testimonialResource,
  faq: faqResource,
  partners: partnerResource,
  banners: bannerResource,
  downloads: downloadResource,
  blog: postResource,
  pages: pageResource,
  batches: batchResource,
  results: resultResource,
  students: studentResource,
  "why-choose": whyChooseResource,
  documents: documentResource,
  "payment-policy": paymentPolicyResource,
  "admission-steps": admissionStepResource,
  values: valueResource,
  "certificate-types": certificateTypeResource,
  certificates: issuedCertificateResource,
  "board-exams": boardExamResource,
  leadership: leadershipResource,
  advisors: advisorResource,
};

export function getResource(key: string): ResourceConfig | null {
  return RESOURCES[key] ?? null;
}

export { slugify } from "@/lib/admin/slug";

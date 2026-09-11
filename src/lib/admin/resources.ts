import "server-only";

import { z } from "zod";

import type { FormSection, FormValues } from "@/lib/admin/fields";
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
    | "student";
  title: string;
  singular: string;
  description?: string;
  newLabel: string;
  columns: ResourceColumn[];
  /** Renders an extra tool above the list, e.g. the students CSV importer. */
  listTool?: "student-import";
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

/** Slugs keep Bangla characters; only whitespace and punctuation are folded. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
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
  title: "ব্যানার",
  singular: "ব্যানার",
  newLabel: "নতুন ব্যানার",
  columns: [
    { key: "image", label: "", type: "image" },
    { key: "title", label: "শিরোনাম" },
    { key: "sortOrder", label: "ক্রম", type: "number", hideOnMobile: true },
  ],
  searchFields: ["title"],
  orderBy: [{ sortOrder: "asc" }],
  schema: z.object({
    title: optionalText,
    subtitle: optionalText,
    image: requiredText,
    link: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    active: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "ব্যানার",
      fields: [
        { name: "title", label: "শিরোনাম", type: "text" },
        { name: "subtitle", label: "উপশিরোনাম", type: "text" },
        { name: "image", label: "ছবি", type: "image", required: true },
        { name: "link", label: "লিংক", type: "text", latin: true },
        sortOrderField,
        { name: "active", label: "সক্রিয়", type: "checkbox" },
      ],
    },
  ],
  toForm: (row) => ({
    title: str(row.title),
    subtitle: str(row.subtitle),
    image: str(row.image),
    link: str(row.link),
    sortOrder: toInt(row.sortOrder),
    active: row.active === undefined ? true : Boolean(row.active),
  }),
  toData: (values) => ({
    title: nullable(values.title),
    subtitle: nullable(values.subtitle),
    image: str(values.image),
    link: nullable(values.link),
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
        { name: "seats", label: "আসন সংখ্যা", type: "number" },
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
    classDays: nullable(values.classDays),
    classTime: nullable(values.classTime),
    note: nullable(values.note),
    published: Boolean(values.published),
  }),
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
  listTool: "student-import",
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
  searchFields: ["roll", "certificateNo", "name", "phone"],
  orderBy: [{ createdAt: "desc" }],
  include: { course: true, batch: true },
  loadOptions: async () => ({
    courses: await courseOptions(),
    batches: await batchOptions(),
  }),
  schema: z.object({
    roll: requiredText,
    certificateNo: optionalText,
    name: requiredText,
    phone: optionalText,
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
        { name: "name", label: "নাম", type: "text", required: true, full: true },
        { name: "roll", label: "রোল", type: "text", required: true, latin: true },
        {
          name: "certificateNo",
          label: "সার্টিফিকেট নম্বর",
          type: "text",
          latin: true,
        },
        { name: "phone", label: "মোবাইল", type: "text", latin: true },
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
    phone: str(row.phone),
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
    phone: nullable(values.phone),
    courseId: str(values.courseId),
    batchId: nullable(values.batchId),
    admissionDate: toDate(values.admissionDate),
    completionDate: toDate(values.completionDate),
    status: str(values.status) || "ACTIVE",
    resultGrade: nullable(values.resultGrade),
    verifiable: Boolean(values.verifiable),
    note: nullable(values.note),
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
};

export function getResource(key: string): ResourceConfig | null {
  return RESOURCES[key] ?? null;
}

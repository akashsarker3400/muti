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
const requiredText = text.min(1, "This field is required");

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
  label: "Published",
  type: "checkbox" as const,
};

const sortOrderField = {
  name: "sortOrder",
  label: "Order (lowest first)",
  type: "number" as const,
  hint: "Use 10, 20, 30 … so new items can be slotted in between later.",
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
  title: "Notices",
  singular: "Notices",
  description: "Expired notices are hidden from the website automatically.",
  newLabel: "New notice",
  columns: [
    { key: "titleEn", label: "Title" },
    {
      key: "category",
      label: "Type",
      type: "badge",
      labels: {
        ADMISSION: "Admission",
        EXAM: "Exam",
        RESULT: "Results",
        HOLIDAY: "Holiday",
        GENERAL: "General",
      },
      hideOnMobile: true,
    },
    { key: "pinned", label: "Pin", type: "bool", hideOnMobile: true },
    { key: "publishedAt", label: "Published on", type: "date", hideOnMobile: true },
    { key: "expiresAt", label: "Expiry", type: "date", hideOnMobile: true },
  ],
  searchFields: ["titleBn", "titleEn", "slug"],
  orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  schema: z.object({
    titleBn: optionalText,
    titleEn: requiredText,
    slug: optionalText,
    bodyBn: optionalText,
    bodyEn: requiredText,
    category: z.enum(["ADMISSION", "EXAM", "RESULT", "HOLIDAY", "GENERAL"]),
    pinned: z.boolean().default(false),
    published: z.boolean().default(true),
    publishedAt: optionalText,
    expiresAt: optionalText,
  }),
  sections: () => [
    {
      id: "content",
      label: "Notices",
      fields: [
        {
          name: "titleBn",
          label: "Title (Bangla)",
          type: "text",
          lang: "bn",
          full: true,
        },
        { name: "bodyBn", label: "Description (Bangla)", type: "richtext", lang: "bn" },
        {
          name: "titleEn",
          label: "Title (English)",
          type: "text",
          lang: "en",
          required: true,
          latin: true,
          full: true,
        },
        {
          name: "bodyEn",
          label: "Body (English)",
          type: "richtext",
          lang: "en",
          required: true,
        },
        {
          name: "category",
          label: "Type",
          type: "select",
          options: [
            { value: "ADMISSION", label: "Admission" },
            { value: "EXAM", label: "Exam" },
            { value: "RESULT", label: "Results" },
            { value: "HOLIDAY", label: "Holiday" },
            { value: "GENERAL", label: "General" },
          ],
        },
        {
          name: "slug",
          label: "URL slug",
          type: "text",
          latin: true,
          hint: "Leave empty to generate from the title.",
        },
        { name: "publishedAt", label: "Publish date", type: "date" },
        {
          name: "expiresAt",
          label: "Expiry date",
          type: "date",
          hint: "The notice disappears after this date. Leave empty for no expiry.",
        },
        { name: "pinned", label: "Pin to top", type: "checkbox" },
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
    titleBn: nullable(values.titleBn),
    titleEn: nullable(values.titleEn),
    slug: slugify(str(values.slug) || str(values.titleEn) || str(values.titleBn)),
    bodyBn: nullable(values.bodyBn),
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
  title: "Faculty",
  singular: "Faculty member",
  newLabel: "New faculty member",
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "designation", label: "Designation", hideOnMobile: true },
    { key: "degrees", label: "Degrees", hideOnMobile: true },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
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
      label: "Faculty member",
      fields: [
        {
          name: "name",
          label: "Name (English)",
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
        { name: "nameBn", label: "Name (Bangla)", type: "text", lang: "bn" },
        {
          name: "designationBn",
          label: "Designation (Bangla)",
          type: "text",
          lang: "bn",
        },
        {
          name: "degrees",
          label: "Degrees",
          type: "text",
          required: true,
          latin: true,
          full: true,
          placeholder: "MBBS, DMU, CMU",
        },
        { name: "bio", label: "Short bio", type: "textarea" },
        { name: "photo", label: "Photo", type: "image" },
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
  title: "Student testimonials",
  singular: "Testimonials",
  newLabel: "New testimonial",
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "course", label: "Course", hideOnMobile: true },
    { key: "rating", label: "Rating", type: "number", hideOnMobile: true },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
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
      label: "Testimonials",
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "rating",
          label: "Rating (1–5)",
          type: "select",
          options: [5, 4, 3, 2, 1].map((value) => ({
            value: String(value),
            label: String(value),
          })),
        },
        { name: "course", label: "Course", type: "text", latin: true },
        { name: "batch", label: "Batch", type: "text", latin: true },
        { name: "text", label: "Remark", type: "textarea", required: true },
        { name: "photo", label: "Photo", type: "image" },
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
  title: "FAQ",
  singular: "Question",
  description:
    "Pick a course to show the question on that course page only; leave empty to show it everywhere.",
  newLabel: "New question",
  columns: [
    { key: "questionEn", label: "Question" },
    { key: "course", label: "Course", path: "course.nameEn", hideOnMobile: true },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
  ],
  searchFields: ["questionBn", "questionEn"],
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  include: { course: true },
  loadOptions: async () => ({ courses: await courseOptions() }),
  schema: z.object({
    questionBn: optionalText,
    questionEn: requiredText,
    answerBn: optionalText,
    answerEn: requiredText,
    courseId: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
  sections: (options) => [
    {
      id: "main",
      label: "Question",
      fields: [
        {
          name: "questionBn",
          label: "Question (Bangla)",
          type: "text",
          lang: "bn",
          full: true,
        },
        { name: "answerBn", label: "Answer (Bangla)", type: "richtext", lang: "bn" },
        {
          name: "questionEn",
          label: "Question (English)",
          type: "text",
          lang: "en",
          required: true,
          full: true,
        },
        { name: "answerEn", label: "Answer (English)", type: "richtext", lang: "en" },
        {
          name: "courseId",
          label: "Course (optional)",
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
    questionBn: nullable(values.questionBn),
    questionEn: nullable(values.questionEn),
    answerBn: nullable(values.answerBn),
    answerEn: nullable(values.answerEn),
    courseId: nullable(values.courseId),
    sortOrder: toInt(values.sortOrder),
    published: Boolean(values.published),
  }),
};

const partnerResource: ResourceConfig = {
  key: "partners",
  model: "partner",
  title: "Affiliations & partners",
  singular: "Organisation",
  newLabel: "New organisation",
  columns: [
    { key: "logo", label: "", type: "image" },
    { key: "name", label: "Name" },
    {
      key: "type",
      label: "Type",
      type: "badge",
      labels: {
        AFFILIATION: "Affiliation",
        COLLABORATION: "Collaboration",
        COMMUNITY: "Health service",
      },
      hideOnMobile: true,
    },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
  ],
  searchFields: ["name"],
  orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  schema: z.object({
    name: requiredText,
    type: z.enum(["AFFILIATION", "COLLABORATION", "COMMUNITY"]),
    logo: optionalText,
    description: optionalText,
    url: optionalText,
    sortOrder: z.coerce.number().int().default(0),
  }),
  sections: () => [
    {
      id: "main",
      label: "Organisation",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, full: true },
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "AFFILIATION", label: "Affiliation" },
            { value: "COLLABORATION", label: "Collaboration" },
            {
              value: "COMMUNITY",
              label: "Health service supporter (shown on /health-service only)",
            },
          ],
        },
        { name: "url", label: "Website", type: "text", latin: true },
        { name: "description", label: "Short description", type: "textarea" },
        {
          name: "logo",
          label: "Logo",
          type: "image",
          hint: "Without a logo the initials of the name are shown.",
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
  title: "Hero banners (slider)",
  singular: "Banner",
  description:
    "Active banners appear as a full-width slider at the top of the homepage (up to 5). Desktop images 1920×700 and mobile images 1080×1080 work best; without an image the slide is a brand gradient. Speed, dots and arrows are under Site Settings → Hero slider.",
  newLabel: "New banner",
  permission: "banners.manage",
  columns: [
    { key: "image", label: "", type: "image" },
    { key: "titleEn", label: "Title" },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
    { key: "startAt", label: "Start", type: "date", hideOnMobile: true },
    { key: "endAt", label: "End", type: "date", hideOnMobile: true },
    { key: "active", label: "Active", type: "bool" },
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
      label: "Banner",
      fields: [
        {
          name: "titleBn",
          label: "Title (Bangla)",
          type: "text",
          lang: "bn",
          full: true,
        },
        {
          name: "subtitleBn",
          label: "Subtitle (Bangla)",
          type: "text",
          lang: "bn",
          full: true,
        },
        {
          name: "ctaLabelBn",
          label: "Button 1 label (Bangla)",
          type: "text",
          lang: "bn",
          placeholder: "Apply Now",
        },
        {
          name: "cta2LabelBn",
          label: "Button 2 label (Bangla)",
          type: "text",
          lang: "bn",
          placeholder: "WhatsApp us",
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
          label: "Desktop image (1920×700)",
          type: "image",
          hint: "Choose photos where the main subject is on the right and the left 40% is plain (wall, flowers, sky) — the text sits on the left. Recommended 1920x700 desktop, 1080x1080 mobile. Slightly darker photos work best. Leave empty for text on a navy gradient.",
        },
        {
          name: "mobileImage",
          label: "Mobile image (1080×1080, optional)",
          type: "image",
        },
        {
          name: "ctaLink",
          label: "Button 1 link",
          type: "text",
          latin: true,
          placeholder: "/apply",
          hint: "Leave the label empty for the default “Apply Now” → /apply.",
        },
        {
          name: "cta2Link",
          label: "Button 2 link",
          type: "text",
          latin: true,
          placeholder: "whatsapp",
          hint: "Type “whatsapp” to link to the WhatsApp number in Site Settings. Leave the label empty for the default WhatsApp button.",
        },
        {
          name: "overlay",
          label: "Scrim strength (8–80, default 40)",
          type: "number",
          hint: "A navy gradient on the text side (the photo is never blurred). 40 is the designed strength; lower is lighter (minimum 20%), above 40 has no further effect.",
        },
        {
          name: "textPosition",
          label: "Text position",
          type: "select",
          hint: "Left: the left side is darkened and the photo on the right stays clear. Center: darkened evenly from all sides.",
          options: [
            { value: "LEFT", label: "Left" },
            { value: "CENTER", label: "Center" },
          ],
        },
        { name: "startAt", label: "Show from (optional)", type: "date" },
        { name: "endAt", label: "Show until (optional)", type: "date" },
        sortOrderField,
        { name: "active", label: "Active", type: "checkbox" },
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
  title: "Downloads",
  singular: "File",
  description: "Add the admission form, routine and prospectus PDFs here.",
  newLabel: "New file",
  columns: [
    { key: "title", label: "Title" },
    { key: "category", label: "Category", hideOnMobile: true },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
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
      label: "File",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, full: true },
        { name: "fileUrl", label: "File", type: "file", required: true },
        {
          name: "category",
          label: "Category",
          type: "text",
          hint: "e.g. admission form, routine, prospectus",
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
  title: "Blog",
  singular: "Post",
  newLabel: "New post",
  columns: [
    { key: "cover", label: "", type: "image" },
    { key: "titleEn", label: "Title" },
    { key: "publishedAt", label: "Published on", type: "date", hideOnMobile: true },
  ],
  searchFields: ["titleBn", "titleEn", "slug"],
  orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  schema: z.object({
    titleBn: optionalText,
    titleEn: requiredText,
    slug: optionalText,
    excerpt: optionalText,
    bodyBn: optionalText,
    bodyEn: requiredText,
    cover: optionalText,
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    published: z.boolean().default(false),
    publishedAt: optionalText,
  }),
  sections: () => [
    {
      id: "main",
      label: "Text",
      fields: [
        {
          name: "titleBn",
          label: "Title (Bangla)",
          type: "text",
          lang: "bn",
          full: true,
        },
        { name: "bodyBn", label: "Text (Bangla)", type: "richtext", lang: "bn" },
        {
          name: "titleEn",
          label: "Title (English)",
          type: "text",
          lang: "en",
          required: true,
          full: true,
        },
        {
          name: "bodyEn",
          label: "Body (English)",
          type: "richtext",
          lang: "en",
          required: true,
        },
        { name: "excerpt", label: "Excerpt", type: "textarea" },
        { name: "cover", label: "Cover image", type: "image" },
        {
          name: "slug",
          label: "URL slug",
          type: "text",
          latin: true,
          hint: "Leave empty to generate from the title.",
        },
        { name: "tags", label: "Tags", type: "tags" },
        { name: "publishedAt", label: "Publish date", type: "date" },
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
      titleBn: nullable(values.titleBn),
      titleEn: nullable(values.titleEn),
      slug: slugify(str(values.slug) || str(values.titleEn) || str(values.titleBn)),
      excerpt: nullable(values.excerpt),
      bodyBn: nullable(values.bodyBn),
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
  title: "Pages",
  singular: "Pages",
  description:
    "Edit the about-story, privacy and terms pages here. Changing a slug can break links on the website.",
  newLabel: "New page",
  columns: [
    { key: "titleEn", label: "Title" },
    { key: "slug", label: "slug", hideOnMobile: true },
  ],
  searchFields: ["titleBn", "titleEn", "slug"],
  orderBy: [{ slug: "asc" }],
  schema: z.object({
    slug: requiredText,
    titleBn: optionalText,
    titleEn: requiredText,
    bodyBn: optionalText,
    bodyEn: requiredText,
    published: z.boolean().default(true),
  }),
  sections: () => [
    {
      id: "main",
      label: "Pages",
      fields: [
        {
          name: "titleBn",
          label: "Title (Bangla)",
          type: "text",
          lang: "bn",
          full: true,
        },
        { name: "bodyBn", label: "Text (Bangla)", type: "richtext", lang: "bn" },
        {
          name: "titleEn",
          label: "Title (English)",
          type: "text",
          lang: "en",
          required: true,
          full: true,
        },
        {
          name: "bodyEn",
          label: "Body (English)",
          type: "richtext",
          lang: "en",
          required: true,
        },
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
    titleBn: nullable(values.titleBn),
    titleEn: nullable(values.titleEn),
    bodyBn: nullable(values.bodyBn),
    bodyEn: nullable(values.bodyEn),
    published: Boolean(values.published),
  }),
};

const batchResource: ResourceConfig = {
  key: "batches",
  model: "batch",
  title: "Batch",
  singular: "Batch",
  description: "The homepage shows the nearest published “UPCOMING” batch.",
  newLabel: "New batch",
  rowTool: "batch-clone",
  columns: [
    { key: "name", label: "Batch" },
    { key: "course", label: "Course", path: "course.nameEn", hideOnMobile: true },
    {
      key: "status",
      label: "Status",
      type: "badge",
      labels: { UPCOMING: "Upcoming", RUNNING: "Running", COMPLETED: "Completed" },
    },
    { key: "startDate", label: "Start", type: "date", hideOnMobile: true },
    { key: "seats", label: "Seats", type: "number", hideOnMobile: true },
    { key: "seatsFilled", label: "Filled", type: "number", hideOnMobile: true },
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
      label: "Batch",
      fields: [
        {
          name: "name",
          label: "Batch name",
          type: "text",
          required: true,
          full: true,
          placeholder: "DMU Batch, Session 2026",
        },
        {
          name: "courseId",
          label: "Course",
          type: "select",
          required: true,
          options: options.courses ?? [],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "UPCOMING", label: "Upcoming" },
            { value: "RUNNING", label: "Running" },
            { value: "COMPLETED", label: "Completed" },
          ],
        },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        {
          name: "seats",
          label: "Total seats",
          type: "number",
          hint: "Leave empty to hide the seat counter on the website.",
        },
        {
          name: "seatsFilled",
          label: "Seats filled",
          type: "number",
          hint: "Increases automatically when an admission is confirmed. A number typed here becomes final and automatic counting stops for this batch.",
        },
        {
          name: "showSeatCounter",
          label: "Show “seats left” on the website",
          type: "checkbox",
        },
        {
          name: "classDays",
          label: "Class days",
          type: "text",
          placeholder: "Friday & Saturday",
        },
        {
          name: "classTime",
          label: "Class time",
          type: "text",
          placeholder: "10:00 am – 2:00 pm",
        },
        { name: "note", label: "Note", type: "textarea" },
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
  title: "Results",
  singular: "Results",
  description: "Attach a PDF or write the results as a table.",
  newLabel: "New result",
  columns: [
    { key: "title", label: "Title" },
    { key: "course", label: "Course", path: "course.nameEn", hideOnMobile: true },
    { key: "batch", label: "Batch", path: "batch.name", hideOnMobile: true },
    { key: "examDate", label: "Exam", type: "date", hideOnMobile: true },
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
      label: "Results",
      fields: [
        { name: "title", label: "Title", type: "text", required: true, full: true },
        {
          name: "courseId",
          label: "Course",
          type: "select",
          options: options.courses ?? [],
        },
        {
          name: "batchId",
          label: "Batch",
          type: "select",
          options: options.batches ?? [],
        },
        { name: "examDate", label: "Exam date", type: "date" },
        { name: "fileUrl", label: "PDF file", type: "file" },
        { name: "bodyHtml", label: "Result table / details", type: "richtext" },
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
  title: "Student",
  singular: "Student",
  description:
    "Turn on “Verifiable” to let a student’s certificate be checked on the public /verify page.",
  newLabel: "New student",
  columns: [
    { key: "roll", label: "Roll" },
    { key: "name", label: "Name" },
    { key: "course", label: "Course", path: "course.nameEn", hideOnMobile: true },
    { key: "batch", label: "Batch", path: "batch.name", hideOnMobile: true },
    {
      key: "status",
      label: "Status",
      type: "badge",
      labels: { ACTIVE: "Active", COMPLETED: "Completed", DROPPED: "Dropped" },
    },
    { key: "verifiable", label: "Verifiable", type: "bool", hideOnMobile: true },
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
      label: "Student",
      fields: [
        { name: "name", label: "Name (English)", type: "text", required: true },
        { name: "nameBn", label: "Name (Bangla)", type: "text" },
        { name: "roll", label: "Roll", type: "text", required: true, latin: true },
        {
          name: "certificateNo",
          label: "Certificate number (legacy field)",
          type: "text",
          latin: true,
          hint: "Certificates are now issued from the “Certificates” menu; this field is kept for older records.",
        },
        { name: "phone", label: "Mobile", type: "text", latin: true },
        { name: "email", label: "Email", type: "text", latin: true },
        { name: "bmdc", label: "BMDC number", type: "text", latin: true },
        {
          name: "gender",
          label: "Gender",
          type: "select",
          options: [
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
            { value: "OTHER", label: "Other" },
          ],
        },
        { name: "dateOfBirth", label: "Date of birth", type: "date" },
        { name: "fatherName", label: "Father's name", type: "text" },
        { name: "motherName", label: "Mother's name", type: "text" },
        { name: "nid", label: "NID", type: "text", latin: true },
        { name: "address", label: "Address", type: "textarea" },
        {
          name: "boardRoll",
          label: "Board roll (BTEB)",
          type: "text",
          latin: true,
          hint: "10-digit board roll; results link to it automatically.",
        },
        {
          name: "boardRegistrationNo",
          label: "Board registration number",
          type: "text",
          latin: true,
        },
        {
          name: "courseId",
          label: "Course",
          type: "select",
          required: true,
          options: options.courses ?? [],
        },
        {
          name: "batchId",
          label: "Batch",
          type: "select",
          options: options.batches ?? [],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "COMPLETED", label: "Completed" },
            { value: "DROPPED", label: "Dropped" },
          ],
        },
        { name: "admissionDate", label: "Admission date", type: "date" },
        { name: "completionDate", label: "Completion date", type: "date" },
        { name: "resultGrade", label: "Grade", type: "text", latin: true },
        { name: "note", label: "Note", type: "textarea" },
        {
          name: "verifiable",
          label: "Verifiable (shown on the public /verify page)",
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
  afterWrite: async (row, data, existing) => {
    // A board roll typed on the student links any unlinked result rows with
    // that roll, so the office does not have to press "auto-link" afterwards
    // (addendum 3, §2).
    const boardRoll = typeof data.boardRoll === "string" ? data.boardRoll : null;
    if (boardRoll) {
      await prisma.boardResult.updateMany({
        where: { roll: boardRoll, studentId: null },
        data: { studentId: row.id },
      });
    }

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
  { value: "ShieldCheck", label: "Shield ✓ (government approved)" },
  { value: "Stethoscope", label: "Stethoscope (practical)" },
  { value: "GraduationCap", label: "Graduation cap (faculty)" },
  { value: "MonitorSmartphone", label: "Machine / device" },
  { value: "Gift", label: "Gift (free class)" },
  { value: "Infinity", label: "Infinity (lifetime access)" },
  { value: "Users", label: "People (mentorship)" },
  { value: "UsersRound", label: "Group (group discount)" },
  { value: "Award", label: "Award (certificate)" },
  { value: "CreditCard", label: "Card (installments)" },
  { value: "BadgeCheck", label: "Badge ✓" },
  { value: "BookOpen", label: "Book" },
  { value: "Clock", label: "Clock" },
  { value: "HeartHandshake", label: "Handshake" },
  { value: "Sparkles", label: "Sparkles" },
  { value: "Trophy", label: "Trophy" },
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
      ...(withTitle ? [{ key: "titleEn", label: "Title" } as ResourceColumn] : []),
      { key: "bodyEn", label: "Text" },
      { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
    ],
    searchFields: ["bodyBn", "bodyEn", "titleBn", "titleEn"],
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    schema: z.object({
      titleBn: optionalText,
      titleEn: requiredText,
      bodyBn: optionalText,
      bodyEn: requiredText,
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
                  label: "Title (Bangla)",
                  type: "text" as const,
                  lang: "bn" as const,
                  full: true,
                },
              ]
            : []),
          {
            name: "bodyBn",
            label: bodyLabelBn,
            type: "textarea",
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
          {
            name: "bodyEn",
            label: bodyLabelEn,
            type: "textarea",
            lang: "en",
            required: true,
          },
          ...(withIcon
            ? [
                {
                  name: "icon",
                  label: "Icon",
                  type: "select" as const,
                  options: WHY_ICON_OPTIONS,
                  hint: "A check mark is shown when none is chosen.",
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
      bodyBn: nullable(values.bodyBn),
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
  title: "Why MUTI",
  singular: "Item",
  newLabel: "New item",
  description: "The “Why choose MUTI” cards on the homepage. The first 8 are shown.",
  withIcon: true,
  bodyLabelBn: "Text (Bangla)",
  bodyLabelEn: "Text (English)",
});

const documentResource = contentResource({
  key: "documents",
  kind: "DOCUMENT",
  title: "Required documents",
  singular: "Document",
  newLabel: "New document",
  description:
    "Shown on every course page and the admission page. Delete them all and the section disappears.",
  bodyLabelBn: "Document name (Bangla)",
  bodyLabelEn: "Document (English)",
});

const paymentPolicyResource = contentResource({
  key: "payment-policy",
  kind: "PAYMENT_POLICY",
  title: "Payment policy",
  singular: "Rule",
  newLabel: "New rule",
  description: "Shown on every course fee card and the admission page.",
  bodyLabelBn: "Rule (Bangla)",
  bodyLabelEn: "Rule (English)",
});

const admissionStepResource = contentResource({
  key: "admission-steps",
  kind: "ADMISSION_STEP",
  title: "Admission steps",
  singular: "Step",
  newLabel: "New step",
  description: "The 1-2-3-4 steps on the admission page, numbered by order.",
  withTitle: true,
  bodyLabelBn: "Description (Bangla)",
  bodyLabelEn: "Description (English)",
});

const valueResource = contentResource({
  key: "values",
  kind: "VALUE",
  title: "Mission & values",
  singular: "Card",
  newLabel: "New card",
  description: "The three cards on the About page: mission, vision and values.",
  withTitle: true,
  bodyLabelBn: "Description (Bangla)",
  bodyLabelEn: "Description (English)",
});

const certificateTypeResource = contentResource({
  key: "certificate-types",
  kind: "CERTIFICATE",
  title: "Certificates offered",
  singular: "Certificate",
  newLabel: "New certificate",
  description: "The list of certificates shown on the accreditation page.",
  bodyLabelBn: "Certificate name (Bangla)",
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
  title: "Certificate",
  singular: "Certificate",
  description:
    "The register of issued certificates. /verify answers from these by certificate number or the student’s BMDC. To revoke one, set the status to “Revoked” and give a reason.",
  newLabel: "New certificate",
  permission: "certificates.manage",
  importEntity: "certificates",
  exportCsv: true,
  baseWhere: { deletedAt: null },
  columns: [
    { key: "certificateNo", label: "Number" },
    { key: "student", label: "Student", path: "student.name" },
    { key: "course", label: "Course", path: "course.code", hideOnMobile: true },
    {
      key: "type",
      label: "Type",
      type: "badge",
      labels: { COURSE: "Course", SEMESTER: "Semester", BOARD: "Board" },
      hideOnMobile: true,
    },
    { key: "issuedAt", label: "Issued", type: "date", hideOnMobile: true },
    {
      key: "status",
      label: "Status",
      type: "badge",
      labels: { VALID: "Valid", REVOKED: "Revoked" },
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
      label: "Certificate",
      fields: [
        {
          name: "certificateNo",
          label: "Certificate number (as printed)",
          type: "text",
          required: true,
          latin: true,
          placeholder: "MUTI-C-2026-0117",
        },
        {
          name: "studentId",
          label: "Student",
          type: "select",
          required: true,
          options: options.students ?? [],
        },
        {
          name: "courseId",
          label: "Course",
          type: "select",
          required: true,
          options: options.courses ?? [],
        },
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "COURSE", label: "Course certificate (MUTI)" },
            { value: "SEMESTER", label: "Semester certificate" },
            {
              value: "BOARD",
              label: "Board certificate (issued by BTEB; MUTI only records it)",
            },
          ],
        },
        {
          name: "session",
          label: "Session",
          type: "text",
          latin: true,
          placeholder: "Jan-June 2025",
        },
        { name: "batchName", label: "Batch", type: "text", latin: true },
        { name: "issuedAt", label: "Issue date", type: "date" },
        {
          name: "grade",
          label: "Grade",
          type: "text",
          latin: true,
          placeholder: "4.00",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "VALID", label: "Valid" },
            { value: "REVOKED", label: "Revoked" },
          ],
        },
        {
          name: "revokedReason",
          label: "Revocation reason",
          type: "text",
          hint: "Shown on the verification page when the status is “Revoked”.",
        },
        {
          name: "file",
          label: "Scanned copy (office only, never shown publicly)",
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
  title: "Board exams & results",
  singular: "Board exam",
  description:
    "Add each examination whose results BTEB has published, then use the “Results” button to enter or paste the roll-wise results. Once published it can be searched on /results.",
  newLabel: "New board exam",
  permission: "results.manage",
  rowTool: "board-results",
  columns: [
    { key: "title", label: "Exam" },
    { key: "session", label: "Session", hideOnMobile: true },
    { key: "publishedOn", label: "Published on", type: "date", hideOnMobile: true },
    { key: "published", label: "Published", type: "bool" },
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
      label: "Exam",
      fields: [
        {
          name: "title",
          label: "Exam title",
          type: "text",
          required: true,
          full: true,
          placeholder: "Certificate in Medical Ultrasound Examination 2025",
        },
        {
          name: "session",
          label: "Session",
          type: "text",
          required: true,
          latin: true,
          placeholder: "Jan-June 2025",
        },
        {
          name: "heldIn",
          label: "Held in",
          type: "text",
          latin: true,
          placeholder: "August 2025",
        },
        { name: "memoNo", label: "Memo number", type: "text", latin: true },
        { name: "publishedOn", label: "Publish date", type: "date" },
        {
          name: "courseId",
          label: "Course",
          type: "select",
          options: options.courses ?? [],
        },
        { name: "boardName", label: "Board", type: "text", latin: true },
        {
          name: "noticeFile",
          label: "Board notice (PDF), downloadable publicly",
          type: "file",
        },
        {
          name: "published",
          label: "Published (searchable on /results)",
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
  title: "Leadership messages",
  singular: "Message",
  description:
    "A message from the chairman, the managing director or anyone else. Publishing creates a homepage card and a /messages/<key> page; a new key makes a new page.",
  newLabel: "New message",
  permission: "leadership.manage",
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "personName", label: "Name" },
    { key: "roleTitleBn", label: "Role", hideOnMobile: true },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
    { key: "published", label: "Published", type: "bool" },
  ],
  searchFields: ["personName", "personNameBn", "roleTitleBn", "roleTitleEn", "key"],
  orderBy: [{ sortOrder: "asc" }],
  schema: z.object({
    key: requiredText.regex(/^[a-z0-9-]+$/i, "Letters, digits and hyphens only"),
    roleTitleBn: optionalText,
    roleTitleEn: requiredText,
    personName: requiredText,
    personNameBn: optionalText,
    degrees: optionalText,
    designationLine: optionalText,
    photo: optionalText,
    messageBn: optionalText,
    messageEn: requiredText,
    excerptBn: optionalText,
    excerptEn: optionalText,
    signatureImage: optionalText,
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(false),
  }),
  sections: () => [
    {
      id: "main",
      label: "Message",
      fields: [
        {
          name: "key",
          label: "URL key",
          type: "text",
          required: true,
          latin: true,
          placeholder: "chairman",
          hint: "The page address will be /messages/<key>, e.g. chairman, managing-director, principal.",
        },
        {
          name: "personName",
          label: "Name (English)",
          type: "text",
          required: true,
          latin: true,
        },
        {
          name: "roleTitleBn",
          label: "Designation (Bangla)",
          type: "text",
          lang: "bn",
        },
        { name: "personNameBn", label: "Name (Bangla)", type: "text", lang: "bn" },
        {
          name: "excerptBn",
          label: "Excerpt (Bangla), two lines on the homepage card",
          type: "textarea",
          lang: "bn",
        },
        {
          name: "messageBn",
          label: "Full message (Bangla)",
          type: "richtext",
          lang: "bn",
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
          required: true,
        },
        {
          name: "degrees",
          label: "Degrees",
          type: "text",
          latin: true,
          placeholder: "MBBS, DMU",
        },
        {
          name: "designationLine",
          label: "Designation line",
          type: "text",
          latin: true,
          placeholder: "Sonologist",
        },
        { name: "photo", label: "Photo", type: "image" },
        { name: "signatureImage", label: "Signature image", type: "image" },
        sortOrderField,
        { name: "published", label: "Published", type: "checkbox" },
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
    roleTitleBn: nullable(values.roleTitleBn),
    roleTitleEn: str(values.roleTitleEn),
    personName: str(values.personName),
    personNameBn: nullable(values.personNameBn),
    degrees: nullable(values.degrees),
    designationLine: nullable(values.designationLine),
    photo: nullable(values.photo),
    messageBn: nullable(values.messageBn),
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
  title: "Advisory board",
  singular: "Advisor",
  description:
    "The category list is edited under Site Settings → Results & verification.",
  newLabel: "New advisor",
  permission: "advisors.manage",
  importEntity: "advisors",
  exportCsv: true,
  columns: [
    { key: "photo", label: "", type: "image" },
    { key: "name", label: "Name" },
    { key: "designation", label: "Designation", hideOnMobile: true },
    { key: "category", label: "Category", hideOnMobile: true },
    { key: "sortOrder", label: "Order", type: "number", hideOnMobile: true },
    { key: "published", label: "Published", type: "bool" },
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
      label: "Advisor",
      fields: [
        {
          name: "name",
          label: "Name (English)",
          type: "text",
          required: true,
          latin: true,
        },
        { name: "nameBn", label: "Name (Bangla)", type: "text" },
        {
          name: "degrees",
          label: "Degrees",
          type: "text",
          latin: true,
          placeholder: "MBBS, FCPS",
        },
        {
          name: "designation",
          label: "Designation (English)",
          type: "text",
          required: true,
          latin: true,
        },
        { name: "designationBn", label: "Designation (Bangla)", type: "text" },
        { name: "organization", label: "Organisation / hospital", type: "text" },
        {
          name: "category",
          label: "Category",
          type: "select",
          required: true,
          options: options.categories ?? [],
        },
        { name: "photo", label: "Photo (square)", type: "image" },
        { name: "bio", label: "Short bio", type: "textarea" },
        sortOrderField,
        { name: "published", label: "Published", type: "checkbox" },
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

const healthServiceResource = contentResource({
  key: "health-services",
  kind: "HEALTH_SERVICE",
  title: "Health service: what we provide",
  singular: "Service",
  newLabel: "New service",
  description:
    "The “What we provide” cards on /health-service. Icon names come from lucide (e.g. Stethoscope, FileText). TODO: the office confirms which scans are covered (abdomen, pregnancy, KUB…).",
  bodyLabelBn: "Service (Bangla)",
  bodyLabelEn: "Service (English)",
  withIcon: true,
});

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
  "health-services": healthServiceResource,
};

export function getResource(key: string): ResourceConfig | null {
  return RESOURCES[key] ?? null;
}

export { slugify } from "@/lib/admin/slug";

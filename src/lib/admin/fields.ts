/**
 * Field definitions for the declarative admin forms.
 *
 * These objects cross the server/client boundary, so everything here must be
 * plain serialisable data — no zod schemas and no render functions.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "checkbox"
  | "select"
  | "date"
  | "image"
  | "file"
  | "tags";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  /** Span the full form width instead of one column. */
  full?: boolean;
  /** Marks the field as one half of a Bangla/English pair; the form renders
   *  all such fields inside BN/EN tabs. */
  lang?: "bn" | "en";
  /** Latin-only input (codes, URLs, numbers) gets LTR direction and Inter. */
  latin?: boolean;
};

export type FormSection = {
  id: string;
  label: string;
  description?: string;
  fields: FieldDef[];
};

export type FormValues = Record<string, string | number | boolean | string[] | null>;

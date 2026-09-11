import type { Locale } from "@/i18n/routing";
import { formatMoney, formatNumber, pick } from "@/lib/format";

/** The subset of Course fields the fee helpers need. */
export type FeeFields = {
  courseFee: number;
  examFee: number | null;
  formFee: number | null;
  bookFee: number | null;
  offerPrice: number | null;
  offerLabelBn: string | null;
  offerLabelEn: string | null;
};

export type FeeRow = { key: string; amount: number };

/**
 * Fee breakdown for the course fee card (section 5.4). Rows with no value are
 * omitted rather than shown as zero, and the total is the sum of what exists.
 *
 * Display rule (section 8): when `courseFee` is 0 the fee is unknown and the
 * page shows "Contact for fee" instead of a table — `hasFee` says which.
 */
export function feeBreakdown(course: FeeFields) {
  const rows: FeeRow[] = [];

  if (course.courseFee > 0) rows.push({ key: "feeCourse", amount: course.courseFee });
  if (course.examFee) rows.push({ key: "feeExam", amount: course.examFee });
  if (course.formFee) rows.push({ key: "feeForm", amount: course.formFee });
  if (course.bookFee) rows.push({ key: "feeBook", amount: course.bookFee });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    hasFee: course.courseFee > 0,
    rows,
    total,
    /** Strikethrough is only shown when both an offer price and a label exist. */
    hasOffer: Boolean(
      course.offerPrice && (course.offerLabelBn || course.offerLabelEn),
    ),
  };
}

export function offerLabel(course: FeeFields, locale: Locale): string {
  return pick(locale, course.offerLabelBn, course.offerLabelEn);
}

/** Course fee as shown on cards: the money, or the "contact us" fallback. */
export function courseFeeLabel(
  course: Pick<FeeFields, "courseFee">,
  locale: Locale,
  contactLabel: string,
): string {
  return course.courseFee > 0 ? formatMoney(course.courseFee, locale) : contactLabel;
}

/**
 * Duration label: the admin-entered label wins, then the month count, then
 * the "contact office" fallback when `durationMonths` is 0 (section 8).
 */
export function durationLabel(
  course: {
    durationMonths: number;
    durationLabelBn: string | null;
    durationLabelEn: string;
  },
  locale: Locale,
  labels: { months: (n: string) => string; contact: string },
): string {
  const explicit = pick(locale, course.durationLabelBn, course.durationLabelEn);
  if (explicit.trim()) return explicit;
  if (course.durationMonths > 0) {
    return labels.months(formatNumber(course.durationMonths, locale));
  }
  return labels.contact;
}

/** Total class count, when the course records lectures and practicals. */
export function totalClasses(course: {
  lectureClasses: number | null;
  practicalClasses: number | null;
}): number | null {
  if (course.lectureClasses == null && course.practicalClasses == null) return null;
  return (course.lectureClasses ?? 0) + (course.practicalClasses ?? 0);
}

import type { MessageChannel } from "@/generated/prisma/enums";

/**
 * The keys the code knows about and the wording the office starts with
 * (addendum 2, A4).
 *
 * Kept apart from `src/lib/messaging.ts` because the database seed needs this
 * list and must not pull in the sender, which is server-only and reaches for
 * Prisma and the gateways.
 */

export type TemplateKey =
  | "application-received"
  | "application-admitted"
  | "class-starting"
  | "appointment-confirmed"
  | "appointment-reminder"
  | "certificate-ready"
  | "payment-received"
  | "installment-due"
  | "installment-overdue"
  | "result-published";

/**
 * The wording the office starts with. Bangla, because the recipients are
 * students and patients here; the office edits these in the admin and the
 * database row wins from then on.
 */
export const DEFAULT_TEMPLATES: Array<{
  key: TemplateKey;
  name: string;
  channel: MessageChannel;
  body: string;
  note: string;
}> = [
  {
    key: "application-received",
    name: "Application received",
    channel: "SMS",
    body: "{name}, আপনার আবেদন আমরা পেয়েছি। {course} সম্পর্কে জানাতে আমরা শিগগিরই ফোন করব। {institute}",
    note: "Sent once, right after an online application is submitted.",
  },
  {
    key: "application-admitted",
    name: "Admission confirmed",
    channel: "SMS",
    body: "{name}, {course} কোর্সে আপনার ভর্তি নিশ্চিত হয়েছে। ব্যাচ: {batch}। বিস্তারিত জানতে ফোন করুন {phone}। {institute}",
    note: "Sent by the office from the application, once the seat is confirmed.",
  },
  {
    key: "class-starting",
    name: "Class starting soon",
    channel: "SMS",
    body: "{name}, আপনার {course} ক্লাস {date} তারিখে শুরু হচ্ছে। সময়মতো উপস্থিত থাকবেন। {institute}",
    note: "Automatic, three days before the batch start date.",
  },
  {
    key: "appointment-confirmed",
    name: "Health serial confirmed",
    channel: "SMS",
    body: "{name}, বিনামূল্যে আলট্রাসাউন্ড সেবার জন্য আপনার সিরিয়াল নম্বর {serial}, তারিখ {date}। সময়মতো আসবেন। {institute}",
    note: "Sent when the desk confirms a serial. Never include the complaint.",
  },
  {
    key: "appointment-reminder",
    name: "Health serial reminder",
    channel: "SMS",
    body: "{name}, আগামীকাল {date} আপনার সিরিয়াল {serial}। {institute}",
    note: "Automatic, the day before the appointment.",
  },
  {
    key: "payment-received",
    name: "Payment received",
    channel: "SMS",
    body: "{name}, আপনার {amount} টাকা জমা হয়েছে। রসিদ নম্বর {receipt}। ধন্যবাদ। {institute}",
    note: "Sent when the office records a payment.",
  },
  {
    key: "installment-due",
    name: "Instalment due",
    channel: "SMS",
    body: "{name}, আপনার {amount} টাকার কিস্তির শেষ তারিখ {date}। সময়মতো জমা দিন। {institute}",
    note: "Automatic, on the 1st of the month for instalments due that month.",
  },
  {
    key: "installment-overdue",
    name: "Instalment overdue",
    channel: "SMS",
    body: "{name}, আপনার {amount} টাকার কিস্তির তারিখ পেরিয়ে গেছে। অফিসে যোগাযোগ করুন। {institute}",
    note: "Automatic, once an instalment passes its grace week.",
  },
  {
    key: "result-published",
    name: "Result published",
    channel: "SMS",
    body: "{name}, {course} পরীক্ষার ফল প্রকাশিত হয়েছে। অফিসে যোগাযোগ করুন বা ওয়েবসাইটে দেখুন। {institute}",
    note: "Sent to the batch when an examination's result is published.",
  },
  {
    key: "certificate-ready",
    name: "Certificate ready to collect",
    channel: "SMS",
    body: "{name}, আপনার সনদ তৈরি হয়েছে। অফিস চলাকালীন সময়ে এসে সংগ্রহ করুন। {institute}",
    note: "Sent by the office once a certificate is approved.",
  },
];

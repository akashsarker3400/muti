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
  | "certificate-ready";

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
    key: "certificate-ready",
    name: "Certificate ready to collect",
    channel: "SMS",
    body: "{name}, আপনার সনদ তৈরি হয়েছে। অফিস চলাকালীন সময়ে এসে সংগ্রহ করুন। {institute}",
    note: "Sent by the office once a certificate is approved.",
  },
];

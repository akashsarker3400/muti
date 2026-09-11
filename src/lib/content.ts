import type { Locale } from "@/i18n/routing";

/**
 * The institute's fixed policy copy from section 3 of the build spec.
 *
 * These constants are now only the **seed source** for the `ContentItem`
 * table — the public site reads the database so the office can edit every
 * line from the admin panel (see `src/lib/content-items.ts`). Changing a
 * string here affects new installations only.
 */

export type BilingualItem = { bn: string; en: string };

export function localize(item: BilingualItem, locale: Locale): string {
  return locale === "en" ? item.en : item.bn;
}

/** Section 3 — "Why choose MUTI". `icon` maps to a lucide icon name. */
export const whyChooseMuti: Array<BilingualItem & { icon: string }> = [
  {
    icon: "ShieldCheck",
    bn: "সরকার অনুমোদিত প্রতিষ্ঠান, কোড ৫৭১২৫",
    en: "Government approved and industry recognized",
  },
  {
    icon: "Stethoscope",
    bn: "প্রত্যেকটি ক্লাসে রিয়েল পেশেন্টের মাধ্যমে হাতে-কলমে প্র্যাকটিক্যাল",
    en: "100% hands-on training on real patients in every class",
  },
  {
    icon: "GraduationCap",
    bn: "অভিজ্ঞ সোনোলজিস্ট ও আল্ট্রাসনোগ্রাম বিশেষজ্ঞ দ্বারা পরিচালিত",
    en: "Experienced sonologists and ultrasonogram specialists as faculty",
  },
  {
    icon: "MonitorSmartphone",
    bn: "আধুনিক আল্ট্রাসাউন্ড মেশিন",
    en: "Modern ultrasound equipment",
  },
  {
    icon: "Gift",
    bn: "ভর্তির আগে ফ্রি ক্লাসের সুযোগ",
    en: "Free class before admission",
  },
  {
    icon: "Infinity",
    bn: "আজীবন প্র্যাকটিক্যাল ও ওয়ার্কশপ",
    en: "Lifetime practical and workshop access",
  },
  {
    icon: "Users",
    bn: "ব্যক্তিগত মেন্টরশিপ ও ক্যারিয়ার সাপোর্ট",
    en: "Personalized mentorship and 100% career support",
  },
  {
    icon: "Award",
    bn: "কোর্স শেষে সরকারি সার্টিফিকেট",
    en: "Government certificate after course completion",
  },
  {
    icon: "UsersRound",
    bn: "গ্রুপ ভর্তিতে বিশেষ ছাড়",
    en: "Special discount for group admission",
  },
  {
    icon: "CreditCard",
    bn: "সহজ কিস্তিতে পেমেন্ট",
    en: "Easy installment (EMI) payment",
  },
];

/** Section 3 — admission requirement, shown on every course page. */
export const admissionRequirement: BilingualItem = {
  bn: "ন্যূনতম যোগ্যতা MBBS বা সমমান। ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন।",
  en: "Minimum qualification: MBBS or equivalent. Intern doctors can also apply.",
};

/** Section 3 — required documents, identical for all courses. */
export const requiredDocuments: BilingualItem[] = [
  { bn: "২ কপি পাসপোর্ট সাইজ ছবি", en: "2 copies passport size photo" },
  { bn: "২ কপি স্ট্যাম্প সাইজ ছবি", en: "2 copies stamp size photo" },
  { bn: "জাতীয় পরিচয়পত্রের কপি", en: "National ID card copy" },
  {
    bn: "Bangladesh Medical and Dental Council (BMDC) রেজিস্ট্রেশন",
    en: "BMDC (Bangladesh Medical and Dental Council) registration",
  },
  { bn: "MBBS সনদপত্র", en: "MBBS certificate" },
  { bn: "SSC পাশের সনদ", en: "SSC certificate" },
];

export const documentsNote: BilingualItem = {
  bn: "ভর্তির সময় সব কাগজপত্রের স্ক্যান কপি ও হার্ড কপি অফিসে জমা দিতে হবে।",
  en: "A scan copy plus a hard copy of every document must be submitted at the office at admission time.",
};

/** Section 3 — payment policy, identical for all courses. */
export const paymentPolicy: BilingualItem[] = [
  {
    bn: "ভর্তির সময় কোর্স ফি'র ৫০% জমা দিয়ে ভর্তি নিশ্চিত করতে হবে।",
    en: "50% of the course fee must be paid at admission to confirm the seat.",
  },
  {
    bn: "অবশিষ্ট টাকা সহজ মাসিক কিস্তিতে পরিশোধযোগ্য।",
    en: "The remaining amount is payable in easy monthly installments.",
  },
  {
    bn: "প্রতি মাসের ১ থেকে ৭ তারিখের মধ্যে কিস্তির টাকা পরিশোধ করতে হবে।",
    en: "Installments must be paid between the 1st and the 7th of each month.",
  },
];

/**
 * Addendum 4 — "What we provide" cards on /health-service. `icon` maps to
 * a lucide icon name from WHY_ICONS. TODO: the office confirms the exact list
 * and which scan types are covered (abdomen, pregnancy, KUB, …).
 */
export const healthServices: Array<BilingualItem & { icon: string }> = [
  {
    icon: "ScanLine",
    bn: "বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা",
    en: "Free ultrasound examination",
  },
  { icon: "FileText", bn: "একই দিনে লিখিত রিপোর্ট", en: "Written report the same day" },
  {
    icon: "Stethoscope",
    bn: "বিনামূল্যে ডাক্তার পরামর্শ",
    en: "Free doctor consultation",
  },
  {
    icon: "Hospital",
    bn: "প্রয়োজনে হাসপাতালে রেফারের পরামর্শ",
    en: "Referral advice to a hospital when needed",
  },
];

/** Section 5.9 — certificates offered, shown on /accreditation. */
export const certificatesOffered: BilingualItem[] = [
  {
    bn: "Certificate in Medical Ultrasound (CMU)",
    en: "Certificate in Medical Ultrasound (CMU)",
  },
  {
    bn: "Certificate in Medical Ultrasound — BTEB অনুমোদিত",
    en: "Certificate in Medical Ultrasound — BTEB approved",
  },
  {
    bn: "Diploma in Medical Ultrasound (DMU)",
    en: "Diploma in Medical Ultrasound (DMU)",
  },
  {
    bn: "Advanced Diploma in Medical Ultrasound (ADMU)",
    en: "Advanced Diploma in Medical Ultrasound (ADMU)",
  },
  {
    bn: "Certificate in Transvaginal Ultrasound (TVS)",
    en: "Certificate in Transvaginal Ultrasound (TVS)",
  },
];

import type { CourseLevel, RoutineType } from "@/generated/prisma/enums";

/**
 * Seed data, section 8 of the build spec.
 *
 * IMPORTANT (note to builder, section 8): the owner's headline fees differ
 * slightly from the official admission PDFs. The values below are seeded
 * exactly as specified — nothing is invented and no discounts are added.
 * Admin staff can change any number afterwards.
 */

export type SeedRoutine = {
  semester?: string;
  label: string;
  title: string;
  type: RoutineType;
};

export type SeedCourse = {
  code: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  fullNameEn: string;
  fullNameBn: string;
  level: CourseLevel;
  durationMonths: number;
  durationLabelEn: string;
  durationLabelBn: string;
  courseFee: number;
  examFee: number | null;
  formFee: number | null;
  bookFee: number | null;
  lectureClasses: number | null;
  practicalClasses: number | null;
  offerPrice: number | null;
  offerLabelEn: string | null;
  offerLabelBn: string | null;
  affiliationNote: string | null;
  certificateNoteBn: string;
  certificateNoteEn: string;
  overviewBn: string;
  overviewEn: string;
  sortOrder: number;
  featured: boolean;
  routines: SeedRoutine[];
};

const ELIGIBILITY_BN =
  "ন্যূনতম যোগ্যতা MBBS বা সমমান। ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন।";
const ELIGIBILITY_EN =
  "Minimum qualification: MBBS or equivalent. Intern doctors can also apply.";

export const eligibility = { bn: ELIGIBILITY_BN, en: ELIGIBILITY_EN };

/** TODO: confirm the exact certificate wording with the owner (section 8). */
const CERT_BTEB_BN =
  "কোর্স শেষে সফলভাবে উত্তীর্ণদের জন্য সরকারি সনদপত্র প্রদান করা হবে।";
const CERT_BTEB_EN =
  "A government certificate is awarded to candidates who successfully pass at the end of the course.";
const CERT_DEFAULT_BN = "কোর্স শেষে প্রতিষ্ঠানের সনদপত্র প্রদান করা হয়।";
const CERT_DEFAULT_EN =
  "An institute certificate is awarded on completion of the course.";

const PRACTICAL_TITLE = "Practical class of ultrasonography on real patients";

/** Builds the alternating lecture/practical list used by the CMU courses. */
function practical(index: number): SeedRoutine {
  return {
    label: `Practical ${index}`,
    title: PRACTICAL_TITLE,
    type: "PRACTICAL",
  };
}

function lecture(index: number, title: string): SeedRoutine {
  return { label: `Lecture ${index}`, title, type: "LECTURE" };
}

// CMU Regular — 13 classes plus a final exam (semester = null).
const cmuRegularRoutine: SeedRoutine[] = [
  lecture(1, "Basic Physics & Liver Ultrasound"),
  { label: "Practical 2", title: "Practical on real patients", type: "PRACTICAL" },
  lecture(3, "GB, Spleen & Pancreas"),
  { label: "Practical 4", title: "Practical on real patients", type: "PRACTICAL" },
  lecture(5, "Kidney, Urinary Bladder"),
  { label: "Practical 6", title: "Practical on real patients", type: "PRACTICAL" },
  lecture(7, "Uterus & Ovary"),
  { label: "Practical 8", title: "Practical on real patients", type: "PRACTICAL" },
  lecture(9, "Pregnancy Ultrasound Part 1"),
  { label: "Practical 10", title: "Practical on real patients", type: "PRACTICAL" },
  lecture(11, "Pregnancy Ultrasound Part 2 (Late)"),
  { label: "Practical 12", title: "Practical on real patients", type: "PRACTICAL" },
  lecture(13, "Review & Reporting"),
  { label: "Exam", title: "Final Exam", type: "EXAM" },
];

// CMU BTEB — L1..L21 alternating with practicals, model test, P23..P30, final exam.
const cmuBtebRoutine: SeedRoutine[] = [
  lecture(1, "Basic Physics of Ultrasound"),
  practical(2),
  lecture(3, "Liver"),
  practical(4),
  lecture(5, "GB, Spleen"),
  practical(6),
  lecture(7, "Pancreas"),
  practical(8),
  lecture(9, "Kidney"),
  practical(10),
  lecture(11, "Urinary Bladder, Prostate"),
  practical(12),
  lecture(13, "Uterus"),
  practical(14),
  lecture(15, "Ovary"),
  practical(16),
  lecture(17, "Early Pregnancy"),
  practical(18),
  lecture(19, "Late Pregnancy"),
  practical(20),
  lecture(21, "Review & Report Writing"),
  practical(22),
  { label: "Exam", title: "Model Test", type: "EXAM" },
  ...Array.from({ length: 8 }, (_, i) => practical(23 + i)),
  { label: "Exam", title: "Final Exam", type: "EXAM" },
];

// DMU — three semesters (section 8).
const dmuRoutine: SeedRoutine[] = [
  ...[
    "Basic Physics Part 1",
    "Basic Physics Part 2",
    "Liver Part 1",
    "Liver Part 2",
    "Gall Bladder Part 1",
    "Gall Bladder Part 2",
    "Spleen",
    "Pancreas",
    "First Semester Review",
  ].map((title, i) => ({
    semester: "1st Semester",
    ...lecture(i + 1, title),
  })),
  {
    semester: "1st Semester",
    label: "Exam",
    title: "1st Semester Examination",
    type: "EXAM" as RoutineType,
  },

  ...[
    "Kidney Part 1",
    "Kidney Part 2",
    "Urinary Bladder",
    "Prostate",
    "Uterus Part 1",
    "Uterus Part 2",
    "Ovary Part 1",
    "Ovary Part 2",
    "Review & Report Writing",
  ].map((title, i) => ({
    semester: "2nd Semester",
    ...lecture(i + 11, title),
  })),
  {
    semester: "2nd Semester",
    label: "Exam",
    title: "2nd Semester Examination",
    type: "EXAM" as RoutineType,
  },

  ...[
    "Early Pregnancy Part 1",
    "Pregnancy Part 2",
    "Late Pregnancy Part 3",
    "Colour Doppler Physics Part 1",
    "Colour Doppler Physics Part 2",
    "Abdomen Doppler",
    "Pregnancy Doppler",
    "USG of Breast (Basic)",
    "USG of Testis (Basic)",
    "TVS / Echocardiogram (Basic)",
    "Review & Report Writing",
  ].map((title, i) => ({
    semester: "3rd Semester",
    ...lecture(i + 21, title),
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    semester: "3rd Semester",
    label: `Practical ${32 + i}`,
    title: "Hands-on training on real patients",
    type: "PRACTICAL" as RoutineType,
  })),
  {
    semester: "3rd Semester",
    label: "Exam",
    title: "Final Examination",
    type: "EXAM" as RoutineType,
  },
];

/**
 * ADMU copies the DMU routine (section 8).
 *
 * The spec also asks for an "Advanced modules: TODO" note here, but that row
 * would render inside the public routine table where prospective students
 * read it. The course overview already tells visitors to contact the office
 * for the advanced module list, and the missing content is recorded in
 * HANDOVER.md instead.
 */
const admuRoutine: SeedRoutine[] = [...dmuRoutine];

export const seedCourses: SeedCourse[] = [
  {
    code: "CMU",
    slug: "cmu-regular",
    nameEn: "CMU (Regular)",
    nameBn: "CMU (রেগুলার)",
    fullNameEn: "Certificate in Medical Ultrasound",
    fullNameBn: "সার্টিফিকেট ইন মেডিকেল আল্ট্রাসাউন্ড (রেগুলার)",
    level: "CERTIFICATE",
    durationMonths: 3,
    durationLabelEn: "3 months",
    durationLabelBn: "৩ মাস",
    courseFee: 11000,
    examFee: 1550,
    formFee: 200,
    bookFee: 850,
    lectureClasses: 6,
    practicalClasses: 7,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: null,
    certificateNoteBn: CERT_DEFAULT_BN,
    certificateNoteEn: CERT_DEFAULT_EN,
    overviewBn:
      "<p>MBBS বা সমমান যোগ্যতাসম্পন্ন ডাক্তারদের জন্য তিন মাসের সার্টিফিকেট কোর্স। বেসিক ফিজিক্স থেকে শুরু করে লিভার, গলব্লাডার, কিডনি, ইউটেরাস, ওভারি এবং প্রেগন্যান্সি আল্ট্রাসাউন্ড পর্যন্ত সব মৌলিক বিষয় পড়ানো হয়। প্রতিটি লেকচারের পরেই রিয়েল পেশেন্টে প্র্যাকটিক্যাল ক্লাস থাকে, যাতে কোর্স শেষে নিজে স্ক্যান ও রিপোর্ট করতে পারেন।</p>",
    overviewEn:
      "<p>A three-month certificate course for doctors holding MBBS or an equivalent qualification. It covers the essentials — from basic physics through liver, gall bladder, kidney, uterus, ovary and pregnancy ultrasound. Every lecture is followed by a practical class on real patients so that you can scan and report independently by the end of the course.</p>",
    sortOrder: 10,
    featured: true,
    routines: cmuRegularRoutine,
  },
  {
    code: "CMU-BTEB",
    slug: "cmu-bteb",
    nameEn: "CMU (BTEB)",
    nameBn: "CMU (বিটিইবি)",
    fullNameEn: "Certificate in Medical Ultrasound (BTEB approved)",
    fullNameBn: "সার্টিফিকেট ইন মেডিকেল আল্ট্রাসাউন্ড (বিটিইবি)",
    level: "CERTIFICATE",
    durationMonths: 6,
    durationLabelEn: "6 months",
    durationLabelBn: "৬ মাস",
    courseFee: 30750,
    examFee: 5350,
    formFee: 200,
    bookFee: 850,
    lectureClasses: 10,
    practicalClasses: 20,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: "BTEB approved",
    certificateNoteBn: CERT_BTEB_BN,
    certificateNoteEn: CERT_BTEB_EN,
    overviewBn:
      "<p>বাংলাদেশ টেকনিক্যাল এডুকেশন বোর্ড (BTEB) অনুমোদিত ছয় মাসের সার্টিফিকেট কোর্স। ২১টি লেকচার ও ৩০টি প্র্যাকটিক্যাল ক্লাসে পুরো অ্যাবডোমেন, পেলভিস ও প্রেগন্যান্সি আল্ট্রাসাউন্ড বিস্তারিতভাবে পড়ানো হয়। কোর্স শেষে মডেল টেস্ট ও বোর্ড পরীক্ষার মাধ্যমে সরকারি সনদপত্র প্রদান করা হয়।</p>",
    overviewEn:
      "<p>A six-month certificate course approved by the Bangladesh Technical Education Board (BTEB). Twenty-one lectures and thirty practical classes cover the abdomen, pelvis and pregnancy ultrasound in depth. A model test and the board examination at the end lead to a government certificate.</p>",
    sortOrder: 20,
    featured: true,
    routines: cmuBtebRoutine,
  },
  {
    code: "DMU",
    slug: "dmu",
    nameEn: "DMU",
    nameBn: "DMU",
    fullNameEn: "Diploma in Medical Ultrasound",
    fullNameBn: "ডিপ্লোমা ইন মেডিকেল আল্ট্রাসাউন্ড",
    level: "DIPLOMA",
    durationMonths: 12,
    durationLabelEn: "1 year (3 semesters)",
    durationLabelBn: "১ বছর (৩ সেমিস্টার)",
    courseFee: 70750,
    examFee: 5350,
    formFee: 200,
    bookFee: 850,
    lectureClasses: 20,
    practicalClasses: 26,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: "BTEB approved",
    certificateNoteBn: CERT_BTEB_BN,
    certificateNoteEn: CERT_BTEB_EN,
    overviewBn:
      "<p>তিন সেমিস্টারে এক বছরের পূর্ণাঙ্গ ডিপ্লোমা কোর্স। প্রথম সেমিস্টারে বেসিক ফিজিক্স ও আপার অ্যাবডোমেন, দ্বিতীয় সেমিস্টারে কিডনি, ইউরিনারি ট্র্যাক্ট ও পেলভিস, তৃতীয় সেমিস্টারে প্রেগন্যান্সি, কালার ডপলার, ব্রেস্ট, টেস্টিস ও TVS-এর বেসিক পড়ানো হয়। প্রতিটি সেমিস্টার শেষে পরীক্ষা এবং শেষ সেমিস্টারে ৯টি হ্যান্ডস-অন প্র্যাকটিক্যাল সেশন থাকে।</p>",
    overviewEn:
      "<p>A full one-year diploma across three semesters. The first semester covers basic physics and the upper abdomen; the second covers kidney, urinary tract and pelvis; the third covers pregnancy, colour Doppler and the basics of breast, testis and TVS. Each semester ends with an examination, and the final semester includes nine hands-on sessions on real patients.</p>",
    sortOrder: 30,
    featured: true,
    routines: dmuRoutine,
  },
  {
    code: "ADMU",
    slug: "admu",
    nameEn: "ADMU",
    nameBn: "ADMU",
    fullNameEn: "Advanced Diploma in Medical Ultrasound",
    fullNameBn: "অ্যাডভান্সড ডিপ্লোমা ইন মেডিকেল আল্ট্রাসাউন্ড",
    level: "DIPLOMA",
    durationMonths: 12,
    durationLabelEn: "1 year",
    durationLabelBn: "১ বছর",
    courseFee: 100000,
    examFee: null,
    formFee: null,
    bookFee: null,
    lectureClasses: null,
    practicalClasses: null,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: null,
    certificateNoteBn: CERT_DEFAULT_BN,
    certificateNoteEn: CERT_DEFAULT_EN,
    overviewBn:
      "<p>DMU-এর সম্পূর্ণ সিলেবাসের উপর ভিত্তি করে অ্যাডভান্সড ডিপ্লোমা কোর্স, সাথে অতিরিক্ত অ্যাডভান্সড মডিউল। বিস্তারিত মডিউল তালিকা ও ক্লাস রুটিনের জন্য অফিসে যোগাযোগ করুন।</p>",
    overviewEn:
      "<p>An advanced diploma built on the full DMU syllabus with additional advanced modules. Please contact the office for the detailed module list and class routine.</p>",
    sortOrder: 40,
    featured: false,
    routines: admuRoutine,
  },
  {
    code: "TVS",
    slug: "tvs",
    nameEn: "TVS",
    nameBn: "TVS",
    fullNameEn: "Certificate in Transvaginal Ultrasound",
    fullNameBn: "ট্রান্সভ্যাজাইনাল আল্ট্রাসাউন্ড সার্টিফিকেট কোর্স",
    level: "SPECIAL",
    durationMonths: 3,
    durationLabelEn: "3 months",
    durationLabelBn: "৩ মাস",
    courseFee: 30000,
    examFee: null,
    formFee: null,
    bookFee: null,
    lectureClasses: null,
    practicalClasses: null,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: null,
    certificateNoteBn: CERT_DEFAULT_BN,
    certificateNoteEn: CERT_DEFAULT_EN,
    overviewBn:
      "<p>ট্রান্সভ্যাজাইনাল আল্ট্রাসাউন্ডের উপর বিশেষায়িত সার্টিফিকেট কোর্স। আর্লি প্রেগন্যান্সি, ইনফার্টিলিটি অ্যাসেসমেন্ট ও গাইনোকোলজিক্যাল প্যাথলজি নির্ণয়ে TVS-এর ব্যবহার হাতে-কলমে শেখানো হয়।</p>",
    overviewEn:
      "<p>A specialised certificate course on transvaginal ultrasound, teaching the use of TVS in early pregnancy, infertility assessment and gynaecological pathology through hands-on practice.</p>",
    sortOrder: 50,
    featured: false,
    routines: [],
  },
  {
    code: "DOPPLER",
    slug: "color-doppler",
    nameEn: "Color Doppler",
    nameBn: "কালার ডপলার",
    fullNameEn: "Color Doppler Ultrasound Course",
    fullNameBn: "কালার ডপলার আল্ট্রাসাউন্ড কোর্স",
    level: "SPECIAL",
    // TODO: duration not provided — seeded as 0 so the page shows
    // "Duration: contact office" (display rule, section 8).
    durationMonths: 0,
    durationLabelEn: "",
    durationLabelBn: "",
    // TODO: fee not provided — seeded as 0 so the page shows "Contact for fee".
    courseFee: 0,
    examFee: null,
    formFee: null,
    bookFee: null,
    lectureClasses: null,
    practicalClasses: null,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: null,
    certificateNoteBn: CERT_DEFAULT_BN,
    certificateNoteEn: CERT_DEFAULT_EN,
    overviewBn:
      "<p>কালার ডপলার আল্ট্রাসাউন্ডের উপর বিশেষায়িত কোর্স। ডপলার ফিজিক্স, অ্যাবডোমেন ডপলার, প্রেগন্যান্সি ডপলার ও ভাস্কুলার স্টাডি অন্তর্ভুক্ত। ফি ও সময়কাল জানতে অফিসে যোগাযোগ করুন।</p>",
    overviewEn:
      "<p>A specialised course on colour Doppler ultrasound covering Doppler physics, abdominal Doppler, pregnancy Doppler and vascular studies. Please contact the office for the fee and duration.</p>",
    sortOrder: 60,
    featured: false,
    routines: [],
  },
  {
    code: "ANOMALY",
    slug: "anomaly-scan",
    nameEn: "Anomaly Scan",
    nameBn: "অ্যানোমালি স্ক্যান",
    fullNameEn: "Anomaly Scan Course",
    fullNameBn: "অ্যানোমালি স্ক্যান কোর্স",
    level: "SPECIAL",
    // TODO: duration not provided — seeded as 0 (section 8).
    durationMonths: 0,
    durationLabelEn: "",
    durationLabelBn: "",
    // TODO: fee not provided — seeded as 0.
    courseFee: 0,
    examFee: null,
    formFee: null,
    bookFee: null,
    lectureClasses: null,
    practicalClasses: null,
    offerPrice: null,
    offerLabelEn: null,
    offerLabelBn: null,
    affiliationNote: null,
    certificateNoteBn: CERT_DEFAULT_BN,
    certificateNoteEn: CERT_DEFAULT_EN,
    overviewBn:
      "<p>ফিটাল অ্যানোমালি স্ক্যানের উপর বিশেষায়িত কোর্স। সিস্টেম-বাই-সিস্টেম ফিটাল অ্যানাটমি, সাধারণ অ্যানোমালি চিহ্নিতকরণ ও রিপোর্টিং শেখানো হয়। ফি ও সময়কাল জানতে অফিসে যোগাযোগ করুন।</p>",
    overviewEn:
      "<p>A specialised course on the fetal anomaly scan: system-by-system fetal anatomy, recognising common anomalies and reporting. Please contact the office for the fee and duration.</p>",
    sortOrder: 70,
    featured: false,
    routines: [],
  },
];

/**
 * The emblem of the Government of the People's Republic of Bangladesh, which
 * both bteb.gov.bd and moedu.gov.bd use as their own site logo (they serve the
 * identical file). Neither body publishes a separate mark. It ships in the
 * repository rather than the uploads volume so a fresh deployment is not left
 * with a broken image; staff can replace it from the admin.
 */
const BD_GOVT_EMBLEM = "/partners/bangladesh-govt-emblem.png";

export const seedPartners = [
  {
    name: "Bangladesh Technical Education Board (BTEB)",
    type: "AFFILIATION" as const,
    logo: BD_GOVT_EMBLEM,
    description:
      "Affiliation with the Bangladesh Technical Education Board, Ministry of Education.",
    url: "http://www.bteb.gov.bd",
    sortOrder: 10,
  },
  {
    name: "Ministry of Education, Govt. of the People's Republic of Bangladesh",
    type: "AFFILIATION" as const,
    logo: BD_GOVT_EMBLEM,
    description: "Government approved institute, code 57125.",
    url: "https://moedu.gov.bd",
    sortOrder: 20,
  },
  {
    name: "World Association of Ultrasound in Combined Medicine (WAUCM)",
    type: "COLLABORATION" as const,
    description: "Collaboration for training content and workshops.",
    url: null,
    sortOrder: 30,
  },
  {
    name: "Jonosastho Pacific Limited",
    type: "COLLABORATION" as const,
    description: "Collaborating organisation.",
    url: null,
    sortOrder: 40,
  },
];

export const seedFaqs = [
  {
    questionBn: "কারা ভর্তি হতে পারবেন?",
    questionEn: "Who can enrol?",
    answerBn: `<p>${ELIGIBILITY_BN}</p>`,
    answerEn: `<p>${ELIGIBILITY_EN}</p>`,
    sortOrder: 10,
  },
  {
    questionBn: "সার্টিফিকেট কি সরকার স্বীকৃত?",
    questionEn: "Is the certificate government recognised?",
    answerBn:
      "<p>MUTI একটি সরকার অনুমোদিত প্রতিষ্ঠান, প্রতিষ্ঠান কোড ৫৭১২৫। BTEB অনুমোদিত কোর্সে (CMU-BTEB ও DMU) সফলভাবে উত্তীর্ণদের সরকারি সনদপত্র প্রদান করা হয়। অন্য কোর্সগুলোতে প্রতিষ্ঠানের সনদপত্র দেওয়া হয়। প্রতিটি কোর্সের নির্দিষ্ট তথ্য কোর্স পেজে দেওয়া আছে।</p>",
    answerEn:
      "<p>MUTI is a government approved institute, institute code 57125. Candidates who pass a BTEB approved course (CMU-BTEB and DMU) receive a government certificate; the other courses award an institute certificate. The exact note for each course is shown on its course page.</p>",
    sortOrder: 20,
  },
  {
    questionBn: "কিস্তিতে পেমেন্ট করা যায়?",
    questionEn: "Can I pay in installments?",
    answerBn:
      "<p>হ্যাঁ। ভর্তির সময় কোর্স ফি'র ৫০% জমা দিয়ে ভর্তি নিশ্চিত করতে হবে, বাকি টাকা সহজ মাসিক কিস্তিতে পরিশোধযোগ্য। প্রতি মাসের ১ থেকে ৭ তারিখের মধ্যে কিস্তির টাকা পরিশোধ করতে হবে।</p>",
    answerEn:
      "<p>Yes. 50% of the course fee is payable at admission to confirm your seat, and the remainder in easy monthly installments, paid between the 1st and the 7th of each month.</p>",
    sortOrder: 30,
  },
  {
    questionBn: "ভর্তির আগে ক্লাস দেখা যায়?",
    questionEn: "Can I see a class before enrolling?",
    answerBn:
      "<p>হ্যাঁ, ভর্তির আগে একটি ক্লাস সম্পূর্ণ ফ্রি করে দেখে নিতে পারেন। ফ্রি ক্লাস বুক করতে ওয়েবসাইটের ফরম পূরণ করুন বা WhatsApp করুন।</p>",
    answerEn:
      "<p>Yes, you can attend one class completely free before you enrol. Use the free class form on this site or message us on WhatsApp to book it.</p>",
    sortOrder: 40,
  },
  {
    questionBn: "ক্লাস কোন দিন হয়?",
    questionEn: "Which days are the classes held?",
    // TODO: class days not provided by the owner.
    answerBn:
      "<p>ক্লাসের দিন ও সময় ব্যাচ অনুযায়ী নির্ধারিত হয়। বর্তমান ব্যাচের রুটিন জানতে অফিসে যোগাযোগ করুন বা WhatsApp করুন।</p>",
    answerEn:
      "<p>Class days and times are set per batch. Please contact the office or message us on WhatsApp for the current batch routine.</p>",
    sortOrder: 50,
  },
  {
    questionBn: "রিয়েল পেশেন্টে প্র্যাকটিস হয়?",
    questionEn: "Do you practise on real patients?",
    answerBn:
      "<p>হ্যাঁ, প্রতিটি ক্লাসে রিয়েল পেশেন্টের মাধ্যমে হাতে-কলমে প্র্যাকটিক্যাল প্র্যাকটিস করানো হয়।</p>",
    answerEn:
      "<p>Yes — every single class includes hands-on practical scanning on real patients.</p>",
    sortOrder: 60,
  },
];

export const seedNotices = [
  {
    slug: "vorti-cholche-cmu-dmu-session-2026",
    titleBn: "ভর্তি চলছে: CMU ও DMU কোর্স, সেশন ২০২৬",
    titleEn: "Admission open: CMU and DMU courses, Session 2026",
    bodyBn:
      "<p>সেশন ২০২৬-এর জন্য CMU (রেগুলার), CMU (BTEB) ও DMU কোর্সে ভর্তি চলছে।</p><p>ন্যূনতম যোগ্যতা MBBS বা সমমান; ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন। ভর্তির সময় কোর্স ফি'র ৫০% জমা দিয়ে আসন নিশ্চিত করতে হবে, বাকি টাকা সহজ মাসিক কিস্তিতে পরিশোধযোগ্য।</p><p>বিস্তারিত জানতে অফিসে যোগাযোগ করুন অথবা WhatsApp করুন।</p>",
    bodyEn:
      "<p>Admission is open for the CMU (Regular), CMU (BTEB) and DMU courses for Session 2026.</p><p>Minimum qualification is MBBS or equivalent; intern doctors can also apply. 50% of the course fee is payable at admission to confirm the seat, with the remainder in easy monthly installments.</p><p>Contact the office or message us on WhatsApp for details.</p>",
    category: "ADMISSION" as const,
    pinned: true,
  },
  {
    slug: "vortir-age-free-class",
    titleBn: "ভর্তির আগে ফ্রি ক্লাসের সুযোগ",
    titleEn: "Attend a free class before you enrol",
    bodyBn:
      "<p>ভর্তির সিদ্ধান্ত নেওয়ার আগে আমাদের একটি ক্লাস সম্পূর্ণ ফ্রি করে দেখে নিতে পারেন। ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিক্যাল কীভাবে হয় তা নিজে দেখে নিন।</p><p>ফ্রি ক্লাস বুক করতে ওয়েবসাইটের ফরম পূরণ করুন অথবা WhatsApp করুন।</p>",
    bodyEn:
      "<p>Before you decide to enrol, you are welcome to attend one of our classes completely free of cost and see for yourself how the hands-on practice on real patients works.</p><p>Fill in the free class form on this site or message us on WhatsApp to book a slot.</p>",
    category: "GENERAL" as const,
    pinned: false,
  },
];

export const seedPages = [
  {
    slug: "about-story",
    titleBn: "আমাদের গল্প",
    titleEn: "Our story",
    bodyBn:
      "<p>২০০৯ সালে যাত্রা শুরু করে ময়মনসিংহ আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট (MUTI) বৃহত্তর ময়মনসিংহে প্রথম আল্ট্রাসাউন্ড প্রশিক্ষণ প্রতিষ্ঠান হিসেবে প্রতিষ্ঠিত হয়। প্রতিষ্ঠানটি সরকার অনুমোদিত, প্রতিষ্ঠান কোড ৫৭১২৫।</p><p>আমাদের লক্ষ্য একটাই — এই অঞ্চলের প্রত্যেক MBBS ডাক্তার যেন নিজে আত্মবিশ্বাসের সাথে আল্ট্রাসাউন্ড স্ক্যান ও রিপোর্ট করতে পারেন। সেজন্য আমরা তত্ত্বের পাশাপাশি প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিক্যালকে সবচেয়ে বেশি গুরুত্ব দিই।</p><p>অভিজ্ঞ সোনোলজিস্ট ও আল্ট্রাসনোগ্রাম বিশেষজ্ঞদের তত্ত্বাবধানে, আধুনিক আল্ট্রাসাউন্ড মেশিন ব্যবহার করে ছোট ব্যাচে ব্যক্তিগত মেন্টরশিপসহ প্রশিক্ষণ দেওয়া হয়। কোর্স শেষ হওয়ার পরেও শিক্ষার্থীরা আজীবন প্র্যাকটিক্যাল ও ওয়ার্কশপে যোগ দিতে পারেন।</p>",
    bodyEn:
      "<p>Mymensingh Ultrasound Training Institute (MUTI) opened in 2009 as the first ultrasound training institute in greater Mymensingh. It is a government approved institute, code 57125.</p><p>Our aim is a simple one: that every MBBS doctor in this region should be able to scan and report independently and with confidence. That is why, alongside the theory, we put the greatest weight on hands-on practice with real patients in every class.</p><p>Training is led by experienced sonologists and ultrasonogram specialists using modern ultrasound equipment, in small batches with personal mentorship. Students keep lifetime access to practical sessions and workshops after their course ends.</p>",
  },
  {
    slug: "privacy",
    titleBn: "প্রাইভেসি পলিসি",
    titleEn: "Privacy policy",
    bodyBn:
      "<p>এই ওয়েবসাইটে আপনি যে তথ্য দেন (নাম, মোবাইল নম্বর, ইমেইল, শিক্ষাগত যোগ্যতা ও মেসেজ) তা শুধুমাত্র আপনার ভর্তি বা অনুসন্ধানের বিষয়ে আপনার সাথে যোগাযোগ করার জন্য ব্যবহার করা হয়।</p><h2>আমরা কী সংগ্রহ করি</h2><p>ভর্তি আবেদন, ফ্রি ক্লাস বুকিং ও যোগাযোগ ফরমে দেওয়া তথ্য আমাদের নিজস্ব সার্ভারে সংরক্ষিত থাকে।</p><h2>আমরা কী করি না</h2><p>আপনার তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা হস্তান্তর করা হয় না।</p><h2>ওয়েবসাইট পরিসংখ্যান ও কুকি</h2><p>ভিজিটর পরিসংখ্যান বুঝতে আমরা Google Analytics ও Meta Pixel ব্যবহার করতে পারি।</p><p>আপনি কোন বিজ্ঞাপন বা লিংক থেকে এসেছেন তা বোঝার জন্য আমরা আপনার ব্রাউজারে একটি ছোট কুকি রাখি (৩০ দিন)। এতে শুধু ক্যাম্পেইনের নাম থাকে, আপনার ব্যক্তিগত কোনো তথ্য থাকে না। এটি শুধু আমাদের নিজস্ব ওয়েবসাইটের কুকি।</p><h2>বিনামূল্যে স্বাস্থ্যসেবার সিরিয়াল</h2><p>স্বাস্থ্যসেবার সিরিয়াল ফরমে দেওয়া নাম, মোবাইল নম্বর, বয়স, এলাকা ও সমস্যার সংক্ষিপ্ত বিবরণ শুধু সিরিয়াল দেওয়া ও আপনার সাথে যোগাযোগের জন্য ব্যবহার হয়। এগুলো স্বাস্থ্য সংক্রান্ত তথ্য: কোনো রোগীর নাম কখনো ওয়েবসাইটে প্রকাশ করা হয় না, লিখিত সম্মতি ছাড়া রোগীর ছবি ব্যবহার করা হয় না, এবং ৯০ দিন পর রেকর্ড থেকে নাম ও নম্বর স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।</p><h2>যোগাযোগ</h2><p>আপনার তথ্য মুছে ফেলার অনুরোধ জানাতে অফিসের ইমেইল বা ফোনে যোগাযোগ করুন।</p>",
    bodyEn:
      "<p>The information you provide on this website (name, mobile number, email, qualification and message) is used only to contact you about your admission or enquiry.</p><h2>What we collect</h2><p>Details submitted through the admission application, free class booking and contact forms are stored on our own server.</p><h2>What we do not do</h2><p>We do not sell or pass your information on to any third party.</p><h2>Website statistics and cookies</h2><p>We may use Google Analytics and the Meta Pixel to understand visitor statistics.</p><p>To understand which advert or link brought you here, we store a small first-party cookie in your browser for 30 days. It holds campaign labels only — no personal information — and is never shared with anyone else.</p><h2>Free health service serials</h2><p>The name, mobile number, age, area and one-line complaint given on the health service serial form are used only to issue the serial and contact you. This is health data: no patient name is ever published on the website, no patient photo is used without written consent, and the name and number are automatically removed from the record after 90 days.</p><h2>Contact</h2><p>To request deletion of your information, contact the office by email or phone.</p>",
  },
  {
    slug: "terms",
    titleBn: "শর্তাবলি",
    titleEn: "Terms",
    bodyBn:
      "<p>এই ওয়েবসাইটে প্রকাশিত কোর্স, ফি ও ব্যাচের তথ্য পরিবর্তনযোগ্য। চূড়ান্ত তথ্যের জন্য অফিসে যোগাযোগ করুন।</p><h2>ভর্তি ও পেমেন্ট</h2><p>ভর্তির সময় কোর্স ফি'র ৫০% জমা দিয়ে আসন নিশ্চিত করতে হবে। অবশিষ্ট টাকা সহজ মাসিক কিস্তিতে, প্রতি মাসের ১ থেকে ৭ তারিখের মধ্যে পরিশোধযোগ্য।</p><h2>অনলাইন আবেদন</h2><p>অনলাইনে আবেদন জমা দেওয়া মানেই আসন নিশ্চিত হওয়া নয়। অফিস থেকে যোগাযোগ করে কাগজপত্র ও ফি জমার পর ভর্তি চূড়ান্ত হয়।</p><h2>সার্টিফিকেট</h2><p>সার্টিফিকেট পাওয়ার জন্য নির্ধারিত ক্লাস উপস্থিতি ও পরীক্ষায় উত্তীর্ণ হওয়া আবশ্যক।</p>",
    bodyEn:
      "<p>Course, fee and batch information published on this website is subject to change. Please contact the office for the final details.</p><h2>Admission and payment</h2><p>50% of the course fee is payable at admission to confirm a seat. The remainder is payable in easy monthly installments, between the 1st and the 7th of each month.</p><h2>Online applications</h2><p>Submitting the online form does not by itself confirm a seat. Admission is finalised after the office contacts you and the documents and fee are submitted.</p><h2>Certificates</h2><p>Certificates require the required class attendance and a pass in the examination.</p>",
  },
];

/** Section 5.14 — two Bangla blog titles seeded as drafts. */
export const seedPosts = [
  {
    slug: "mbbs-er-por-ultrasound-course-keno-korben",
    titleBn: "MBBS এর পর আল্ট্রাসাউন্ড কোর্স কেন করবেন",
    titleEn: "Why do an ultrasound course after MBBS",
    excerpt:
      "MBBS শেষ করার পর আল্ট্রাসাউন্ড দক্ষতা কীভাবে আপনার প্র্যাকটিস ও আয়ের সুযোগ বদলে দিতে পারে।",
    // Draft: the owner will write the article. Seeded so the admin has a shell to edit.
    bodyBn:
      "<p>এই লেখাটি খসড়া অবস্থায় আছে। প্রকাশ করার আগে অ্যাডমিন প্যানেল থেকে সম্পূর্ণ লেখাটি যোগ করুন।</p>",
    bodyEn:
      "<p>This article is a draft. Write the full article in the admin panel before publishing.</p>",
    tags: ["career", "ultrasound"],
  },
  {
    slug: "cmu-o-dmu-course-er-parthokko",
    titleBn: "CMU ও DMU কোর্সের পার্থক্য",
    titleEn: "The difference between the CMU and DMU courses",
    excerpt:
      "সময়কাল, সিলেবাস, প্র্যাকটিক্যাল ক্লাসের সংখ্যা ও সার্টিফিকেট — কোনটি আপনার জন্য উপযুক্ত।",
    bodyBn:
      "<p>এই লেখাটি খসড়া অবস্থায় আছে। প্রকাশ করার আগে অ্যাডমিন প্যানেল থেকে সম্পূর্ণ লেখাটি যোগ করুন।</p>",
    bodyEn:
      "<p>This article is a draft. Write the full article in the admin panel before publishing.</p>",
    tags: ["cmu", "dmu"],
  },
];

/* ---- Addendum 3 --------------------------------------------------------- */

/**
 * Leadership messages (addendum 3, §4). Seeded unpublished with TODO copy:
 * the office fills in the person, photo and message, then publishes.
 */
export const seedLeadership = [
  {
    key: "chairman",
    roleTitleBn: "প্রতিষ্ঠান চেয়ারম্যান",
    roleTitleEn: "Chairman",
    personName: "TODO: Chairman's name",
    personNameBn: "TODO: চেয়ারম্যানের নাম",
    messageBn: "<p>TODO: প্রতিষ্ঠান চেয়ারম্যান এর বক্তব্য এখানে লিখুন।</p>",
    messageEn: "<p>TODO: Message from the Chairman.</p>",
    excerptBn: "TODO: হোমপেজ কার্ডের জন্য দুই লাইনের উদ্ধৃতি।",
    excerptEn: "TODO: Two-line excerpt for the homepage card.",
    sortOrder: 1,
    published: false,
  },
  {
    key: "managing-director",
    roleTitleBn: "ব্যবস্থাপনা পরিচালক",
    roleTitleEn: "Managing Director",
    personName: "TODO: Managing Director's name",
    personNameBn: "TODO: ব্যবস্থাপনা পরিচালকের নাম",
    messageBn: "<p>TODO: ব্যবস্থাপনা পরিচালক এর বক্তব্য এখানে লিখুন।</p>",
    messageEn: "<p>TODO: Message from the Managing Director.</p>",
    excerptBn: "TODO: হোমপেজ কার্ডের জন্য দুই লাইনের উদ্ধৃতি।",
    excerptEn: "TODO: Two-line excerpt for the homepage card.",
    sortOrder: 2,
    published: false,
  },
];

/**
 * Hero slides (addendum 3, §6). No photos are shipped — the office uploads
 * them from Admin → হিরো ব্যানার; until then each slide is a brand gradient
 * carrying the copy from the addendum.
 */
export const seedBanners = [
  {
    titleBn: "ময়মনসিংহে সর্বপ্রথম সরকার অনুমোদিত আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট",
    subtitleBn: "CMU, DMU, ADMU কোর্সে ভর্তি চলছে",
    title: "The first government-approved ultrasound training institute in Mymensingh",
    subtitle: "Admission open for CMU, DMU and ADMU",
    image: "",
    sortOrder: 1,
    active: true,
  },
  {
    titleBn: "প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিক্যাল",
    subtitleBn: "অভিজ্ঞ সোনোলজিস্ট দ্বারা পরিচালিত",
    title: "Hands-on practice on real patients in every class",
    subtitle: "Taught by experienced sonologists",
    image: "",
    sortOrder: 2,
    active: true,
  },
  {
    titleBn: "ভর্তির আগে ফ্রি ক্লাসের সুযোগ",
    subtitleBn: "আজই WhatsApp করুন 01778-838644",
    title: "Attend a free class before you enrol",
    subtitle: "WhatsApp us today: 01778-838644",
    image: "",
    sortOrder: 3,
    active: true,
  },
];

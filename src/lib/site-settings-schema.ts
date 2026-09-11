import { z } from "zod";

/**
 * Site Settings is a single JSON row (section 6 / 7.11) so office staff can
 * edit every global string without a migration. The zod schema below is the
 * contract: it validates admin input and fills in defaults for keys that were
 * added after the row was first written.
 */

const optionalString = z.string().trim().default("");

/**
 * z.coerce.boolean() treats the string "false" as true, which is exactly what
 * an HTML form sends. This accepts the shapes a form or JSON body can produce.
 */
const booleanish = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return ["true", "1", "on", "yes"].includes(value.trim().toLowerCase());
  })
  .default(false);

export const siteSettingsSchema = z.object({
  general: z
    .object({
      nameBn: optionalString,
      nameEn: optionalString,
      shortName: optionalString,
      taglineBn: optionalString,
      taglineEn: optionalString,
      positioningBn: optionalString,
      positioningEn: optionalString,
      establishedYear: z.coerce.number().int().min(1900).max(2200).default(2009),
      govtCode: optionalString,
    })
    .prefault({}),

  /** Logo, favicon and the brand colours (all editable from the admin). */
  branding: z
    .object({
      logo: optionalString,
      favicon: optionalString,
      /** Hex colours. Empty means "use the built-in palette". */
      brandColor: optionalString,
      brandDarkColor: optionalString,
      accentColor: optionalString,
      highlightColor: optionalString,
    })
    .prefault({}),

  /** Single sentences that appear on more than one page. */
  content: z
    .object({
      eligibilityBn: optionalString,
      eligibilityEn: optionalString,
      documentsNoteBn: optionalString,
      documentsNoteEn: optionalString,
    })
    .prefault({}),

  contact: z
    .object({
      addressBn: optionalString,
      addressEn: optionalString,
      phone1: optionalString,
      phone2: optionalString,
      whatsapp: optionalString,
      email: optionalString,
      facebook: optionalString,
      youtube: optionalString,
      /** Either a full Google Maps embed URL, or leave blank to use the address. */
      mapEmbedUrl: optionalString,
      mapLat: optionalString,
      mapLng: optionalString,
      officeHoursBn: optionalString,
      officeHoursEn: optionalString,
    })
    .prefault({}),

  homepage: z
    .object({
      heroTitleBn: optionalString,
      heroTitleEn: optionalString,
      heroSubBn: optionalString,
      heroSubEn: optionalString,
      heroImage: optionalString,
      /** Hero slides, in order. Falls back to `heroImage` when empty. */
      heroImages: z.array(z.string().trim()).max(8).default([]),
      /** Seconds per slide; 0 means no automatic change. */
      heroSlideSeconds: z.coerce.number().int().min(0).max(60).default(5),
      practicalImage: optionalString,
      doctorsTrained: z.coerce.number().int().min(0).default(0),
      showDoctorsTrained: booleanish,
      practicalsPerBatch: z.coerce.number().int().min(0).default(0),
      showPracticalsPerBatch: booleanish.prefault(true),
      /** Scrolling notice ticker between the header and the hero. */
      showNoticeTicker: booleanish.prefault(true),
      /** Homepage strip of up to four advisors (addendum 3, §5). */
      showAdvisors: booleanish.prefault(true),
      /** Homepage "Messages from leadership" cards (addendum 3, §4). */
      showLeadership: booleanish.prefault(true),
      announcementTextBn: optionalString,
      announcementTextEn: optionalString,
      announcementLink: optionalString,
      announcementActive: booleanish,
      /** "accent" (red) or "brand" (navy) */
      announcementColor: z.enum(["accent", "brand", "highlight"]).default("accent"),
      /** Picking a preset fills the announcement text on save, then clears itself. */
      announcementPreset: z.enum(["", "HEALTH"]).default(""),
    })
    .prefault({}),

  whatsapp: z
    .object({
      defaultMessageBn: optionalString,
      defaultMessageEn: optionalString,
    })
    .prefault({}),

  seo: z
    .object({
      titleBn: optionalString,
      titleEn: optionalString,
      descriptionBn: optionalString,
      descriptionEn: optionalString,
      ogImage: optionalString,
    })
    .prefault({}),

  integrations: z
    .object({
      ga4Id: optionalString,
      metaPixelId: optionalString,
      /** Comma separated list; SMTP credentials stay in env (section 7.11). */
      notifyEmails: optionalString,
    })
    .prefault({}),

  footer: z
    .object({
      aboutBn: optionalString,
      aboutEn: optionalString,
    })
    .prefault({}),
  /** Addendum 3 §1 — Cloudflare Turnstile on /verify and /results. Blank = off. */
  security: z
    .object({
      turnstileSiteKey: optionalString,
      turnstileSecretKey: optionalString,
    })
    .prefault({}),
  /** Addendum 3 §2 — subject code legend, one "code = name" per line. */
  results: z
    .object({
      subjectCodes: optionalString,
    })
    .prefault({}),
  /** Addendum 3 §6 — full-width hero slider behaviour. */
  hero: z
    .object({
      autoplay: booleanish.prefault(true),
      intervalMs: z.coerce.number().int().min(1500).max(60000).default(5000),
      transition: z.enum(["FADE", "SLIDE"]).default("FADE"),
      showDots: booleanish.prefault(true),
      showArrows: booleanish.prefault(true),
      pauseOnHover: booleanish.prefault(true),
      heightDesktop: z.coerce.number().int().min(320).max(900).default(520),
      heightMobile: z.coerce.number().int().min(240).max(700).default(360),
    })
    .prefault({}),
  /** Addendum 4 — free health service. Hidden everywhere until `published`. */
  health: z
    .object({
      published: booleanish,
      heroImage: optionalString,
      introBn: optionalString,
      introEn: optionalString,
      daysBn: optionalString,
      daysEn: optionalString,
      timeBn: optionalString,
      timeEn: optionalString,
      /** Weekday codes the service runs, e.g. ["SAT","SUN"]; drives the open-today badge. */
      openDays: z.array(z.string()).default([]),
      /** Days per week the service runs, for the homepage stat tile. 0 hides it. */
      daysPerWeek: z.coerce.number().int().min(0).max(7).default(0),
      /** Year the service started, for the "since" tile. 0 hides it. */
      sinceYear: z.coerce.number().int().min(0).max(2100).default(0),
      /** Admin "closed today" switch, e.g. a holiday. */
      holiday: booleanish,
      holidayNoteBn: optionalString,
      holidayNoteEn: optionalString,
      eligibilityBn: optionalString,
      eligibilityEn: optionalString,
      transparencyBn: optionalString,
      transparencyEn: optionalString,
      /** Patients / reports before daily counting started; daily counts add on top. */
      statsBasePatients: z.coerce.number().int().min(0).default(0),
      statsBaseReports: z.coerce.number().int().min(0).default(0),
      showSupportCta: booleanish,
      supportTextBn: optionalString,
      supportTextEn: optionalString,
    })
    .prefault({}),
  /** Addendum 3 §5 — advisor categories, one "KEY = বাংলা | English" per line. */
  advisors: z
    .object({
      categories: optionalString,
    })
    .prefault({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

/** Institute facts from section 3 — the seed and the fallback both use these. */
export const defaultSiteSettings: SiteSettings = siteSettingsSchema.parse({
  general: {
    nameBn: "ময়মনসিংহ আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট",
    nameEn: "Mymensingh Ultrasound Training Institute",
    shortName: "MUTI",
    taglineBn:
      "বৃহত্তর ময়মনসিংহে সর্বপ্রথম এবং সরকার কর্তৃক অনুমোদিত আলট্রাসাউন্ড প্রশিক্ষণ কেন্দ্র",
    taglineEn: "Training is an Investment for the Future",
    positioningBn: "সাফল্যের ১৬তম বর্ষে পদার্পণ",
    positioningEn: "Stepping into our 16th year of success",
    establishedYear: 2009,
    govtCode: "57125",
  },
  branding: {
    // Empty = the placeholder mark in public/logo.svg and the palette in
    // globals.css. Both are replaced from Site Settings -> ব্র্যান্ডিং.
    logo: "",
    favicon: "",
    brandColor: "",
    brandDarkColor: "",
    accentColor: "",
    highlightColor: "",
  },
  content: {
    eligibilityBn:
      "ন্যূনতম যোগ্যতা MBBS বা সমমান। ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন।",
    eligibilityEn:
      "Minimum qualification: MBBS or equivalent. Intern doctors can also apply.",
    documentsNoteBn:
      "ভর্তির সময় সব কাগজপত্রের স্ক্যান কপি ও হার্ড কপি অফিসে জমা দিতে হবে।",
    documentsNoteEn:
      "A scan copy plus a hard copy of every document must be submitted at the office at admission time.",
  },
  contact: {
    addressBn:
      "১১০/৩ বাঘমারা রোড, বাঘ্মপল্লী, রেডিয়েন্ট হাসপাতাল এর পাশের বিল্ডিং, নিলুফা হাউজ এর ২য় তলা, ময়মনসিংহ",
    addressEn:
      "110/3 Baghmara Road, 2nd Floor, Nilufa House (building beside Radiant Hospital), Mymensingh",
    phone1: "+8801778838644",
    phone2: "+8801995357860",
    whatsapp: "+8801778838644",
    email: "mymensinghultrasound@gmail.com",
    facebook: "https://www.facebook.com/profile.php?id=61582686171614",
    youtube: "",
    // TODO: exact coordinates not provided — the map falls back to an address query.
    mapEmbedUrl: "",
    mapLat: "",
    mapLng: "",
    // TODO: office hours not provided by the owner yet.
    officeHoursBn: "",
    officeHoursEn: "",
  },
  homepage: {
    heroTitleBn: "ময়মনসিংহে সর্বপ্রথম সরকার অনুমোদিত আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট",
    heroTitleEn:
      "The first government approved ultrasound training institute in Mymensingh",
    heroSubBn:
      "CMU, DMU, ADMU ও স্পেশাল কোর্সে ভর্তি চলছে। প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিস।",
    heroSubEn:
      "Admission open for CMU, DMU, ADMU and special courses. Hands-on practice on real patients in every class.",
    heroImage: "",
    heroImages: [],
    heroSlideSeconds: 5,
    practicalImage: "",
    // TODO: real "doctors trained" figure not provided — tile stays hidden.
    doctorsTrained: 0,
    showDoctorsTrained: false,
    practicalsPerBatch: 30,
    showPracticalsPerBatch: true,
    showNoticeTicker: true,
    showAdvisors: true,
    showLeadership: true,
    announcementTextBn: "ভর্তি চলছে — CMU, DMU ও ADMU কোর্স, সেশন ২০২৬",
    announcementTextEn: "Admission open — CMU, DMU and ADMU courses, Session 2026",
    announcementLink: "/admission",
    announcementActive: true,
    announcementColor: "accent",
  },
  whatsapp: {
    defaultMessageBn: "আমি MUTI এর কোর্স সম্পর্কে জানতে চাই",
    defaultMessageEn: "I would like to know about the courses at MUTI",
  },
  seo: {
    titleBn: "ময়মনসিংহ আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট | সরকার অনুমোদিত, কোড ৫৭১২৫",
    titleEn: "Mymensingh Ultrasound Training Institute | Govt. approved, Code 57125",
    descriptionBn:
      "বৃহত্তর ময়মনসিংহে সর্বপ্রথম সরকার অনুমোদিত আল্ট্রাসাউন্ড প্রশিক্ষণ কেন্দ্র। MBBS ডাক্তারদের জন্য CMU, DMU, ADMU ও স্পেশাল কোর্স। প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিক্যাল।",
    descriptionEn:
      "The first government approved ultrasound training centre in greater Mymensingh. CMU, DMU, ADMU and special courses for MBBS doctors, with hands-on real-patient practice in every class.",
    ogImage: "",
  },
  integrations: {
    ga4Id: "",
    metaPixelId: "",
    notifyEmails: "mymensinghultrasound@gmail.com",
  },
  footer: {
    aboutBn:
      "২০০৯ সাল থেকে বৃহত্তর ময়মনসিংহে ডাক্তারদের জন্য সরকার অনুমোদিত আল্ট্রাসাউন্ড প্রশিক্ষণ। প্রতিষ্ঠান কোড ৫৭১২৫।",
    aboutEn:
      "Government approved ultrasound training for doctors in greater Mymensingh since 2009. Institute code 57125.",
  },
  security: { turnstileSiteKey: "", turnstileSecretKey: "" },
  results: {
    // TODO: real subject names from the BTEB syllabus (addendum 3, §2).
    subjectCodes: "",
  },
  hero: {},
  health: {
    published: false,
    introBn:
      "প্রশিক্ষণের পাশাপাশি MUTI প্রতিদিন গরীব ও অসহায় মানুষের জন্য বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা, লিখিত রিপোর্ট ও ডাক্তার পরামর্শ দেয়। অভিজ্ঞ সোনোলজিস্টের তত্ত্বাবধানে প্রশিক্ষণরত MBBS ডাক্তাররা পরীক্ষা করেন।",
    introEn:
      "Alongside its training, MUTI provides free ultrasound examinations, written reports and doctor consultations every day for poor and underprivileged people. Examinations are performed by MBBS doctors in training under the supervision of experienced sonologists.",
    // TODO: real schedule from the office (addendum 4, §2.4).
    daysBn: "TODO: শনিবার থেকে বৃহস্পতিবার",
    daysEn: "TODO: Saturday to Thursday",
    timeBn: "TODO: সকাল ১০টা থেকে দুপুর ১টা",
    timeEn: "TODO: 10:00 am to 1:00 pm",
    eligibilityBn:
      "<p>গরীব ও অসহায় রোগীরা এই সেবা পাবেন।</p><p>সাথে আনুন: আগের প্রেসক্রিপশন বা রিপোর্ট (থাকলে) এবং একটি মোবাইল নম্বর।</p><p><em>TODO: যোগ্যতার কোনো নিয়ম থাকলে এখানে লিখুন।</em></p>",
    eligibilityEn:
      "<p>Poor and underprivileged patients are welcome.</p><p>Please bring: any previous prescription or reports, and a phone number.</p><p><em>TODO: add any eligibility rule.</em></p>",
    transparencyBn:
      "<p>এই সেবায় পরীক্ষাগুলো প্রশিক্ষণরত MBBS ডাক্তাররা অভিজ্ঞ সোনোলজিস্টের তত্ত্বাবধানে করেন। প্রদত্ত রিপোর্টটি একটি স্ক্রিনিং রিপোর্ট; চিকিৎসার জন্য বিশেষজ্ঞ ডাক্তারের পরামর্শ নিন।</p>",
    transparencyEn:
      "<p>Examinations are performed by MBBS doctors in training under the supervision of experienced sonologists. The report is a screening report; please consult a specialist for treatment.</p>",
    supportTextBn:
      "দাতা, হাসপাতাল বা সংস্থা হিসেবে এই সেবায় সহযোগিতা করতে বা রোগী রেফার করতে চাইলে আমাদের সাথে যোগাযোগ করুন।",
    supportTextEn:
      "Donors, hospitals and organisations that want to support the service or refer patients are welcome to get in touch.",
  },
  advisors: {
    categories:
      "ADVISOR = উপদেষ্টা | Advisors\nHONORARY = সম্মানিত উপদেষ্টা | Honorary advisors\nACADEMIC_COUNCIL = একাডেমিক কাউন্সিল | Academic council",
  },
});

import type { FormSection, FormValues } from "@/lib/admin/fields";
import type { SiteSettings } from "@/lib/site-settings-schema";

/**
 * Site Settings editor (section 7.11). Field names are dotted paths into the
 * settings JSON ("contact.phone1"), which the save action expands back into
 * the nested object.
 */
export const settingsFormSections: FormSection[] = [
  {
    id: "general",
    label: "সাধারণ",
    fields: [
      {
        name: "general.nameBn",
        label: "প্রতিষ্ঠানের নাম (বাংলা)",
        type: "text",
        lang: "bn",
      },
      {
        name: "general.taglineBn",
        label: "ট্যাগলাইন (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "general.positioningBn",
        label: "পজিশনিং লাইন (বাংলা)",
        type: "text",
        lang: "bn",
        hint: "যেমন: সাফল্যের ১৬তম বর্ষে পদার্পণ — প্রতি বছর হালনাগাদ করুন।",
      },
      {
        name: "general.nameEn",
        label: "Institute name (English)",
        type: "text",
        latin: true,
        lang: "en",
      },
      {
        name: "general.taglineEn",
        label: "Tagline (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "general.positioningEn",
        label: "Positioning line (English)",
        type: "text",
        lang: "en",
      },
      { name: "general.shortName", label: "সংক্ষিপ্ত নাম", type: "text", latin: true },
      {
        name: "general.govtCode",
        label: "সরকারি প্রতিষ্ঠান কোড",
        type: "text",
        latin: true,
      },
      {
        name: "general.establishedYear",
        label: "প্রতিষ্ঠার সাল",
        type: "number",
        hint: "হোমপেজের “বছরের অভিজ্ঞতা” এখান থেকে স্বয়ংক্রিয়ভাবে গণনা হয়।",
      },
    ],
  },
  {
    id: "branding",
    label: "ব্র্যান্ডিং",
    description:
      "লোগো ও রং এখান থেকে বদলালে পুরো ওয়েবসাইটে সাথে সাথে বদলে যাবে। রঙের ঘর ফাঁকা রাখলে ডিফল্ট নেভি-লাল-হলুদ রংই থাকবে।",
    fields: [
      {
        name: "branding.logo",
        label: "লোগো",
        type: "image",
        hint: "স্বচ্ছ ব্যাকগ্রাউন্ডের PNG বা WEBP সবচেয়ে ভালো দেখায়। বর্গাকার হলে উত্তম।",
      },
      {
        name: "branding.favicon",
        label: "ফেভিকন (ব্রাউজার ট্যাবের ছোট আইকন)",
        type: "image",
        hint: "বর্গাকার ছবি দিন (৫১২×৫১২ যথেষ্ট)। ওয়েবসাইটে এটি স্বয়ংক্রিয়ভাবে ছোট করে দেখানো হয়, তাই বড় ফাইল দিলেও সাইট ধীর হবে না।",
      },
      {
        name: "branding.brandColor",
        label: "প্রধান রং (নেভি)",
        type: "text",
        latin: true,
        placeholder: "#1B2A6B",
        hint: "হেক্স কোড দিন, যেমন #1B2A6B। ভুল ফরম্যাট দিলে ডিফল্ট রংই থাকবে।",
      },
      {
        name: "branding.brandDarkColor",
        label: "গাঢ় রং (ফুটার ও সাইডবার)",
        type: "text",
        latin: true,
        placeholder: "#12204F",
      },
      {
        name: "branding.accentColor",
        label: "অ্যাকসেন্ট রং (লাল বাটন ও ব্যাজ)",
        type: "text",
        latin: true,
        placeholder: "#D62828",
      },
      {
        name: "branding.highlightColor",
        label: "হাইলাইট রং (হলুদ)",
        type: "text",
        latin: true,
        placeholder: "#F4C20D",
      },
    ],
  },
  {
    id: "sitecontent",
    label: "সাধারণ লেখা",
    description: "এই দুটি বাক্য একাধিক পাতায় দেখানো হয় — কোর্স পেজ ও ভর্তি পাতায়।",
    fields: [
      {
        name: "content.eligibilityBn",
        label: "ভর্তির যোগ্যতা (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "content.eligibilityEn",
        label: "Eligibility (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "content.documentsNoteBn",
        label: "কাগজপত্র সংক্রান্ত নোট (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "content.documentsNoteEn",
        label: "Documents note (English)",
        type: "textarea",
        lang: "en",
      },
    ],
  },
  {
    id: "contact",
    label: "যোগাযোগ",
    fields: [
      {
        name: "contact.addressBn",
        label: "ঠিকানা (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "contact.officeHoursBn",
        label: "অফিস সময় (বাংলা)",
        type: "text",
        lang: "bn",
        placeholder: "শনি–বৃহস্পতি, সকাল ১০টা – রাত ৮টা",
      },
      {
        name: "contact.addressEn",
        label: "Address (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "contact.officeHoursEn",
        label: "Office hours (English)",
        type: "text",
        lang: "en",
      },
      { name: "contact.phone1", label: "ফোন ১", type: "text", latin: true },
      { name: "contact.phone2", label: "ফোন ২", type: "text", latin: true },
      {
        name: "contact.whatsapp",
        label: "WhatsApp নম্বর",
        type: "text",
        latin: true,
        hint: "ওয়েবসাইটের সব WhatsApp বাটন এই নম্বরে যাবে।",
      },
      { name: "contact.email", label: "ইমেইল", type: "text", latin: true },
      { name: "contact.facebook", label: "Facebook পেজ", type: "text", latin: true },
      { name: "contact.youtube", label: "YouTube চ্যানেল", type: "text", latin: true },
      {
        name: "contact.mapEmbedUrl",
        label: "Google Maps embed URL",
        type: "text",
        latin: true,
        full: true,
        hint: "ফাঁকা রাখলে ঠিকানা দিয়ে ম্যাপ দেখানো হবে। নির্দিষ্ট পিন দিতে নিচে অক্ষাংশ/দ্রাঘিমাংশ দিন।",
      },
      {
        name: "contact.mapLat",
        label: "অক্ষাংশ (latitude)",
        type: "text",
        latin: true,
      },
      {
        name: "contact.mapLng",
        label: "দ্রাঘিমাংশ (longitude)",
        type: "text",
        latin: true,
      },
    ],
  },
  {
    id: "homepage",
    label: "হোমপেজ",
    fields: [
      {
        name: "homepage.heroTitleBn",
        label: "হিরো শিরোনাম (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "homepage.heroSubBn",
        label: "হিরো উপশিরোনাম (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "homepage.heroTitleEn",
        label: "Hero title (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "homepage.heroSubEn",
        label: "Hero subtitle (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "homepage.heroImages",
        label: "হিরো ছবি (স্লাইডশো)",
        type: "images",
        hint: "হোমপেজে হিরো ব্যানার সক্রিয় থাকলে যে ব্যানারের নিজের ছবি নেই, সেটি এখানকার ছবি ক্রম অনুযায়ী ব্যবহার করে (১ম ব্যানার → ১ম ছবি)। ব্যানার না থাকলে এগুলোই ছোট স্লাইডশো হয়ে দেখায়। প্রথম ছবিটি সবার আগে লোড হয় — সবচেয়ে ভালোটা আগে রাখুন।",
      },
      {
        name: "homepage.heroSlideSeconds",
        label: "প্রতি স্লাইড কত সেকেন্ড",
        type: "number",
        hint: "০ দিলে নিজে থেকে বদলাবে না, দর্শক ডট চেপে বদলাতে পারবেন।",
      },
      {
        name: "homepage.practicalImage",
        label: "প্র্যাকটিক্যাল সেকশনের ছবি",
        type: "image",
      },
      {
        name: "homepage.doctorsTrained",
        label: "প্রশিক্ষিত ডাক্তার সংখ্যা",
        type: "number",
        hint: "সঠিক সংখ্যা না জানা পর্যন্ত নিচের সুইচটি বন্ধ রাখুন — তাহলে টাইলটি দেখাবে না।",
      },
      {
        name: "homepage.showDoctorsTrained",
        label: "“প্রশিক্ষিত ডাক্তার” টাইল দেখান",
        type: "checkbox",
      },
      {
        name: "homepage.practicalsPerBatch",
        label: "প্রতি ব্যাচে প্র্যাকটিক্যাল ক্লাস",
        type: "number",
      },
      {
        name: "homepage.showPracticalsPerBatch",
        label: "“প্র্যাকটিক্যাল ক্লাস” টাইল দেখান",
        type: "checkbox",
      },
      {
        name: "homepage.showLeadership",
        label: "“নেতৃত্বের বক্তব্য” সেকশন দেখান",
        type: "checkbox",
      },
      {
        name: "homepage.showAdvisors",
        label: "“উপদেষ্টা মণ্ডলী” সেকশন দেখান",
        type: "checkbox",
      },
      {
        name: "homepage.showNoticeTicker",
        label: "নোটিশ টিকার দেখান",
        type: "checkbox",
        hint: "হেডারের নিচে প্রকাশিত নোটিশগুলো খবরের মতো স্ক্রল করে। নোটিশ মেনু থেকেই নিয়ন্ত্রিত হয়।",
      },
    ],
  },
  {
    id: "announcement",
    label: "ঘোষণা বার",
    description: "হেডারের উপরে দেখানো ঘোষণা। দর্শক চাইলে বন্ধ করে দিতে পারেন।",
    fields: [
      {
        name: "homepage.announcementTextBn",
        label: "ঘোষণা (বাংলা)",
        type: "text",
        lang: "bn",
        full: true,
      },
      {
        name: "homepage.announcementTextEn",
        label: "Announcement (English)",
        type: "text",
        lang: "en",
        full: true,
      },
      {
        name: "homepage.announcementLink",
        label: "লিংক",
        type: "text",
        latin: true,
        placeholder: "/admission",
      },
      {
        name: "homepage.announcementColor",
        label: "রঙ",
        type: "select",
        options: [
          { value: "accent", label: "লাল" },
          { value: "brand", label: "নেভি" },
          { value: "highlight", label: "হলুদ" },
        ],
      },
      { name: "homepage.announcementActive", label: "ঘোষণা চালু", type: "checkbox" },
      {
        name: "homepage.announcementPreset",
        label: "প্রিসেট লেখা",
        type: "select",
        options: [
          { value: "", label: "— নিজের লেখা রাখুন —" },
          {
            value: "HEALTH",
            label:
              "আজ বিনামূল্যে আল্ট্রাসাউন্ড সেবা চালু আছে, সিরিয়ালের জন্য কল করুন…",
          },
        ],
        hint: "একটি প্রিসেট বেছে সংরক্ষণ করলে ঘোষণার লেখা (বাংলা ও English) ও লিংক বসে যাবে।",
      },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description:
      "কোর্স পেজে স্বয়ংক্রিয়ভাবে কোর্সের নামসহ আলাদা মেসেজ যায়; নিচেরটি বাকি সব পেজের জন্য।",
    fields: [
      {
        name: "whatsapp.defaultMessageBn",
        label: "ডিফল্ট মেসেজ (বাংলা)",
        type: "text",
        lang: "bn",
        full: true,
      },
      {
        name: "whatsapp.defaultMessageEn",
        label: "Default message (English)",
        type: "text",
        lang: "en",
        full: true,
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    fields: [
      {
        name: "seo.titleBn",
        label: "ডিফল্ট শিরোনাম (বাংলা)",
        type: "text",
        lang: "bn",
        full: true,
      },
      {
        name: "seo.descriptionBn",
        label: "ডিফল্ট বিবরণ (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "seo.titleEn",
        label: "Default title (English)",
        type: "text",
        lang: "en",
        full: true,
      },
      {
        name: "seo.descriptionEn",
        label: "Default description (English)",
        type: "textarea",
        lang: "en",
      },
      {
        name: "seo.ogImage",
        label: "শেয়ার ছবি (OG image)",
        type: "image",
        hint: "ফাঁকা রাখলে স্বয়ংক্রিয়ভাবে তৈরি করা ছবি ব্যবহার হবে।",
      },
    ],
  },
  {
    id: "integrations",
    label: "ইন্টিগ্রেশন",
    description:
      "SMTP ব্যবহারকারী ও পাসওয়ার্ড নিরাপত্তার জন্য সার্ভারের environment variable-এ রাখা হয়, এখানে নয়।",
    fields: [
      {
        name: "integrations.ga4Id",
        label: "Google Analytics (GA4) ID",
        type: "text",
        latin: true,
        placeholder: "G-XXXXXXX",
        hint: "ফাঁকা রাখলে কোনো ট্র্যাকিং স্ক্রিপ্ট লোড হবে না।",
      },
      {
        name: "integrations.metaPixelId",
        label: "Meta Pixel ID",
        type: "text",
        latin: true,
      },
      {
        name: "integrations.notifyEmails",
        label: "নোটিফিকেশন ইমেইল",
        type: "text",
        latin: true,
        full: true,
        hint: "একাধিক হলে কমা দিয়ে আলাদা করুন। নতুন আবেদন এলে এখানে ইমেইল যাবে।",
      },
    ],
  },
  {
    id: "hero",
    label: "হিরো স্লাইডার",
    description:
      "ব্যানার মেনুতে সক্রিয় ব্যানার থাকলে হোমপেজের ওপরে পুরো প্রস্থের স্লাইডার দেখায়; না থাকলে আগের হিরো সেকশন।",
    fields: [
      { name: "hero.autoplay", label: "নিজে থেকে বদলাবে", type: "checkbox" },
      {
        name: "hero.intervalMs",
        label: "প্রতি স্লাইড (মিলিসেকেন্ড)",
        type: "number",
        hint: "৫০০০ = ৫ সেকেন্ড।",
      },
      {
        name: "hero.transition",
        label: "ট্রানজিশন",
        type: "select",
        options: [
          { value: "FADE", label: "ফেড" },
          { value: "SLIDE", label: "স্লাইড" },
        ],
      },
      { name: "hero.heightDesktop", label: "উচ্চতা — ডেস্কটপ (px)", type: "number" },
      { name: "hero.heightMobile", label: "উচ্চতা — মোবাইল (px)", type: "number" },
      { name: "hero.showDots", label: "ডট দেখান", type: "checkbox" },
      { name: "hero.showArrows", label: "তীর দেখান", type: "checkbox" },
      { name: "hero.pauseOnHover", label: "মাউস রাখলে থামবে", type: "checkbox" },
    ],
  },
  {
    id: "results",
    label: "ফলাফল ও যাচাই",
    fields: [
      {
        name: "results.subjectCodes",
        label: "বিষয় কোডের নাম",
        type: "textarea",
        full: true,
        latin: true,
        hint: "প্রতি লাইনে একটি: 01101 = Basic Physics। ফেল করা বিষয়ের চিপে টুলটিপ হিসেবে দেখায়। [T] = থিওরি, [P] = প্র্যাকটিক্যাল।",
      },
      {
        name: "advisors.categories",
        label: "উপদেষ্টা ক্যাটাগরি",
        type: "textarea",
        full: true,
        latin: true,
        hint: "প্রতি লাইনে একটি: KEY = বাংলা নাম | English name। উপদেষ্টা যোগ করার সময় KEY বাছাই করা হয়।",
      },
      {
        name: "security.turnstileSiteKey",
        label: "Cloudflare Turnstile — Site key",
        type: "text",
        latin: true,
        hint: "ফাঁকা রাখলে যাচাই ও ফলাফল পাতায় Turnstile দেখাবে না (রেট লিমিট তবুও থাকে)।",
      },
      {
        name: "security.turnstileSecretKey",
        label: "Cloudflare Turnstile — Secret key",
        type: "text",
        latin: true,
      },
    ],
  },
  {
    id: "health",
    label: "স্বাস্থ্যসেবা",
    description:
      "বিনামূল্যে আল্ট্রাসাউন্ড সেবা (অ্যাডেনডাম ৪)। “প্রকাশিত” টিক না দেওয়া পর্যন্ত মেনু, হোমপেজ সেকশন ও /health-service পাতা কোথাও দেখাবে না। TODO লেখাগুলো অফিসের তথ্য দিয়ে বদলান।",
    fields: [
      { name: "health.published", label: "প্রকাশিত (সাইটে দেখাবে)", type: "checkbox" },
      { name: "health.holiday", label: "আজ বন্ধ (ছুটি)", type: "checkbox" },
      {
        name: "health.showSupportCta",
        label: "“সহযোগিতা করতে চান?” সেকশন দেখান",
        type: "checkbox",
      },
      {
        name: "health.openDays",
        label: "যে দিনগুলো সেবা চলে",
        type: "multiselect",
        full: true,
        hint: "“আজ খোলা/বন্ধ” ব্যাজ এখান থেকে হিসাব হয় (বাংলাদেশ সময়)। কিছু না বাছলে ব্যাজ দেখাবে না।",
        options: [
          { value: "SAT", label: "শনিবার" },
          { value: "SUN", label: "রবিবার" },
          { value: "MON", label: "সোমবার" },
          { value: "TUE", label: "মঙ্গলবার" },
          { value: "WED", label: "বুধবার" },
          { value: "THU", label: "বৃহস্পতিবার" },
          { value: "FRI", label: "শুক্রবার" },
        ],
      },
      {
        name: "health.daysPerWeek",
        label: "সপ্তাহে কত দিন (হোমপেজ টাইল; ০ = লুকানো)",
        type: "number",
      },
      {
        name: "health.sinceYear",
        label: "কোন সাল থেকে (হোমপেজ টাইল; ০ = লুকানো)",
        type: "number",
      },
      {
        name: "health.statsBasePatients",
        label: "এ পর্যন্ত রোগী (ভিত্তি সংখ্যা)",
        type: "number",
        hint: "দৈনিক হিসাব শুরুর আগের মোট। প্রতিদিনের সংখ্যা স্বাস্থ্যসেবা → সিরিয়াল পাতায় যোগ হয়। ০ হলে টাইল লুকানো।",
      },
      {
        name: "health.statsBaseReports",
        label: "এ পর্যন্ত রিপোর্ট (ভিত্তি সংখ্যা)",
        type: "number",
      },
      { name: "health.heroImage", label: "পাতার ছবি", type: "image" },
      {
        name: "health.introBn",
        label: "পরিচিতি — দুই লাইন (বাংলা)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.daysBn",
        label: "দিন (বাংলা, যেমন: শনিবার থেকে বৃহস্পতিবার)",
        type: "text",
        lang: "bn",
      },
      {
        name: "health.timeBn",
        label: "সময় (বাংলা, যেমন: সকাল ১০টা থেকে দুপুর ১টা)",
        type: "text",
        lang: "bn",
      },
      {
        name: "health.holidayNoteBn",
        label: "ছুটির নোট (বাংলা)",
        type: "text",
        lang: "bn",
        full: true,
      },
      {
        name: "health.eligibilityBn",
        label: "কারা পাবেন / কী আনবেন (বাংলা)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "health.transparencyBn",
        label: "“জেনে রাখুন” নোট (বাংলা)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "health.supportTextBn",
        label: "সহযোগিতার আহ্বান (বাংলা)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.introEn",
        label: "Intro — two lines (English)",
        type: "textarea",
        lang: "en",
        full: true,
      },
      {
        name: "health.daysEn",
        label: "Days (English)",
        type: "text",
        lang: "en",
        latin: true,
      },
      {
        name: "health.timeEn",
        label: "Time (English)",
        type: "text",
        lang: "en",
        latin: true,
      },
      {
        name: "health.holidayNoteEn",
        label: "Holiday note (English)",
        type: "text",
        lang: "en",
        full: true,
      },
      {
        name: "health.eligibilityEn",
        label: "Who can get it (English)",
        type: "richtext",
        lang: "en",
      },
      {
        name: "health.transparencyEn",
        label: "Transparency note (English)",
        type: "richtext",
        lang: "en",
      },
      {
        name: "health.supportTextEn",
        label: "Support call (English)",
        type: "textarea",
        lang: "en",
        full: true,
      },
    ],
  },
  {
    id: "footer",
    label: "ফুটার",
    fields: [
      {
        name: "footer.aboutBn",
        label: "ফুটার পরিচিতি (বাংলা)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "footer.aboutEn",
        label: "Footer about (English)",
        type: "textarea",
        lang: "en",
      },
    ],
  },
];

/** Nested settings -> flat dotted form values. */
export function settingsToForm(settings: SiteSettings): FormValues {
  const values: FormValues = {};

  for (const [group, entries] of Object.entries(settings)) {
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      values[`${group}.${key}`] =
        typeof value === "boolean" || typeof value === "number" || Array.isArray(value)
          ? (value as FormValues[string])
          : String(value ?? "");
    }
  }

  return values;
}

/** Flat dotted form values -> nested settings object. */
export function formToSettings(values: Record<string, unknown>) {
  const nested: Record<string, Record<string, unknown>> = {};

  for (const [path, value] of Object.entries(values)) {
    const [group, key] = path.split(".");
    if (!group || !key) continue;
    nested[group] ??= {};
    nested[group][key] = value;
  }

  return nested;
}

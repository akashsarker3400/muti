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
      { name: "homepage.heroImage", label: "হিরো ছবি", type: "image" },
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
        typeof value === "boolean" || typeof value === "number"
          ? value
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

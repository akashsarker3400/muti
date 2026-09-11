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
    label: "General",
    fields: [
      {
        name: "general.nameBn",
        label: "Institute name (Bangla)",
        type: "text",
        lang: "bn",
      },
      {
        name: "general.taglineBn",
        label: "Tagline (Bangla)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "general.positioningBn",
        label: "Positioning line (Bangla)",
        type: "text",
        lang: "bn",
        hint: "e.g. “Entering our 16th year”. Update it every year.",
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
      { name: "general.shortName", label: "Short name", type: "text", latin: true },
      {
        name: "general.govtCode",
        label: "Government institute code",
        type: "text",
        latin: true,
      },
      {
        name: "general.establishedYear",
        label: "Year established",
        type: "number",
        hint: "The homepage “years of experience” is calculated from this.",
      },
    ],
  },
  {
    id: "branding",
    label: "Branding",
    description:
      "Changing the logo or colours here changes the whole website at once. Leave a colour empty to keep the default navy, red and yellow.",
    fields: [
      {
        name: "branding.logo",
        label: "Logo",
        type: "image",
        hint: "A PNG or WEBP with a transparent background looks best, ideally square.",
      },
      {
        name: "branding.favicon",
        label: "Favicon (the small browser-tab icon)",
        type: "image",
        hint: "Use a square image (512×512 is enough). It is resized automatically, so a large file will not slow the site.",
      },
      {
        name: "branding.brandColor",
        label: "Primary colour (navy)",
        type: "text",
        latin: true,
        placeholder: "#1B2A6B",
        hint: "Enter a hex code such as #1B2A6B. An invalid value keeps the default colour.",
      },
      {
        name: "branding.brandDarkColor",
        label: "Dark colour (footer and sidebar)",
        type: "text",
        latin: true,
        placeholder: "#12204F",
      },
      {
        name: "branding.accentColor",
        label: "Accent colour (red buttons and badges)",
        type: "text",
        latin: true,
        placeholder: "#D62828",
      },
      {
        name: "branding.highlightColor",
        label: "Highlight colour (yellow)",
        type: "text",
        latin: true,
        placeholder: "#F4C20D",
      },
    ],
  },
  {
    id: "sitecontent",
    label: "Common texts",
    description:
      "These two sentences appear on several pages: the course pages and the admission page.",
    fields: [
      {
        name: "content.eligibilityBn",
        label: "Eligibility (Bangla)",
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
        label: "Documents note (Bangla)",
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
    label: "Contact",
    fields: [
      {
        name: "contact.addressBn",
        label: "Address (Bangla)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "contact.officeHoursBn",
        label: "Office hours (Bangla)",
        type: "text",
        lang: "bn",
        placeholder: "Sat–Thu, 10:00 am – 8:00 pm",
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
      { name: "contact.phone1", label: "Phone 1", type: "text", latin: true },
      { name: "contact.phone2", label: "Phone 2", type: "text", latin: true },
      {
        name: "contact.whatsapp",
        label: "WhatsApp number",
        type: "text",
        latin: true,
        hint: "Every WhatsApp button on the website goes to this number.",
      },
      { name: "contact.email", label: "Email", type: "text", latin: true },
      { name: "contact.facebook", label: "Facebook page", type: "text", latin: true },
      { name: "contact.youtube", label: "YouTube channel", type: "text", latin: true },
      {
        name: "contact.mapEmbedUrl",
        label: "Google Maps embed URL",
        type: "text",
        latin: true,
        full: true,
        hint: "Leave empty to show the map by address. For an exact pin, enter latitude/longitude below.",
      },
      {
        name: "contact.mapLat",
        label: "Latitude",
        type: "text",
        latin: true,
      },
      {
        name: "contact.mapLng",
        label: "Longitude",
        type: "text",
        latin: true,
      },
    ],
  },
  {
    id: "homepage",
    label: "Homepage",
    fields: [
      {
        name: "homepage.heroTitleBn",
        label: "Hero title (Bangla)",
        type: "textarea",
        lang: "bn",
      },
      {
        name: "homepage.heroSubBn",
        label: "Hero subtitle (Bangla)",
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
        label: "Hero images (slideshow)",
        type: "images",
        hint: "While hero banners are active, a banner without its own photo uses these images in order (1st banner → 1st image). Without banners they show as a small slideshow. The first image loads first, so put the best one first.",
      },
      {
        name: "homepage.heroSlideSeconds",
        label: "Seconds per slide",
        type: "number",
        hint: "0 disables autoplay; visitors can still use the dots.",
      },
      {
        name: "homepage.practicalImage",
        label: "Practical section image",
        type: "image",
      },
      {
        name: "homepage.doctorsTrained",
        label: "Doctors trained",
        type: "number",
        hint: "Keep the switch below off until the real number is known; the tile stays hidden.",
      },
      {
        name: "homepage.showDoctorsTrained",
        label: "Show the “doctors trained” tile",
        type: "checkbox",
      },
      {
        name: "homepage.practicalsPerBatch",
        label: "Practical classes per batch",
        type: "number",
      },
      {
        name: "homepage.showPracticalsPerBatch",
        label: "Show the “practical classes” tile",
        type: "checkbox",
      },
      {
        name: "homepage.showLeadership",
        label: "Show the “Messages from leadership” section",
        type: "checkbox",
      },
      {
        name: "homepage.showAdvisors",
        label: "Show the “Advisory board” section",
        type: "checkbox",
      },
      {
        name: "homepage.showBook",
        label: "Show the course book strip",
        type: "checkbox",
        hint: "Appears under “Why choose MUTI” once the book is published from the Course Book menu.",
      },
      {
        name: "homepage.showNoticeTicker",
        label: "Show the notice ticker",
        type: "checkbox",
        hint: "Published notices scroll under the header like a news ticker. Managed from the Notices menu.",
      },
    ],
  },
  {
    id: "announcement",
    label: "Announcement bar",
    description: "The announcement shown above the header. Visitors can dismiss it.",
    fields: [
      {
        name: "homepage.announcementTextBn",
        label: "Announcement (Bangla)",
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
        label: "Link",
        type: "text",
        latin: true,
        placeholder: "/admission",
      },
      {
        name: "homepage.announcementColor",
        label: "Colour",
        type: "select",
        options: [
          { value: "accent", label: "Red" },
          { value: "brand", label: "Navy" },
          { value: "highlight", label: "Yellow" },
        ],
      },
      {
        name: "homepage.announcementActive",
        label: "Announcement on",
        type: "checkbox",
      },
      {
        name: "homepage.announcementPreset",
        label: "Preset text",
        type: "select",
        options: [
          { value: "", label: "— keep my own text —" },
          {
            value: "HEALTH",
            label:
              "Free ultrasonogram and doctor consultation for expectant mothers, serial: …",
          },
        ],
        hint: "Choosing a preset and saving fills in the announcement text (Bangla and English) and the link.",
      },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description:
      "Course pages send their own message with the course name; the text below is for every other page.",
    fields: [
      {
        name: "whatsapp.defaultMessageBn",
        label: "Default message (Bangla)",
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
        label: "Default title (Bangla)",
        type: "text",
        lang: "bn",
        full: true,
      },
      {
        name: "seo.descriptionBn",
        label: "Default description (Bangla)",
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
        label: "Share image (OG image)",
        type: "image",
        hint: "Leave empty to use the generated image.",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    description:
      "The SMTP user and password live in the server environment variables for security, not here.",
    fields: [
      {
        name: "integrations.ga4Id",
        label: "Google Analytics (GA4) ID",
        type: "text",
        latin: true,
        placeholder: "G-XXXXXXX",
        hint: "Leave empty and no tracking script is loaded.",
      },
      {
        name: "integrations.metaPixelId",
        label: "Meta Pixel ID",
        type: "text",
        latin: true,
      },
      {
        name: "integrations.notifyEmails",
        label: "Notification emails",
        type: "text",
        latin: true,
        full: true,
        hint: "Separate several with commas. New applications are emailed here.",
      },
    ],
  },
  {
    id: "hero",
    label: "Hero slider",
    description:
      "With an active banner in the Banners menu the homepage opens with a full-width slider; otherwise the static hero section.",
    fields: [
      { name: "hero.autoplay", label: "Autoplay", type: "checkbox" },
      {
        name: "hero.intervalMs",
        label: "Per slide (milliseconds)",
        type: "number",
        hint: "5000 = 5 seconds.",
      },
      {
        name: "hero.transition",
        label: "Transition",
        type: "select",
        options: [
          { value: "FADE", label: "Fade" },
          { value: "SLIDE", label: "Slide" },
        ],
      },
      { name: "hero.heightDesktop", label: "Height, desktop (px)", type: "number" },
      { name: "hero.heightMobile", label: "Height, mobile (px)", type: "number" },
      { name: "hero.showDots", label: "Show dots", type: "checkbox" },
      { name: "hero.showArrows", label: "Show arrows", type: "checkbox" },
      { name: "hero.pauseOnHover", label: "Pause on hover", type: "checkbox" },
    ],
  },
  {
    id: "results",
    label: "Results & verification",
    fields: [
      {
        name: "results.subjectCodes",
        label: "Subject code names",
        type: "textarea",
        full: true,
        latin: true,
        hint: "One per line: 01101 = Basic Physics. Shown as a tooltip on failed-subject chips. [T] = theory, [P] = practical.",
      },
      {
        name: "advisors.categories",
        label: "Advisor categories",
        type: "textarea",
        full: true,
        latin: true,
        hint: "One per line: KEY = Bangla name | English name. The KEY is chosen when adding an advisor.",
      },
      {
        name: "security.turnstileSiteKey",
        label: "Cloudflare Turnstile — Site key",
        type: "text",
        latin: true,
        hint: "Leave empty and Turnstile is not shown on the verify and results pages (the rate limit still applies).",
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
    label: "Health service",
    description:
      "The free ultrasound service (addendum 4). Until “Published” is ticked, the menu item, the homepage section and /health-service are hidden. Replace the TODO texts with the office’s details.",
    fields: [
      {
        name: "health.published",
        label: "Published (visible on the site)",
        type: "checkbox",
      },
      { name: "health.holiday", label: "Closed today (holiday)", type: "checkbox" },
      {
        name: "health.showSupportCta",
        label: "Show the “Want to support?” section",
        type: "checkbox",
      },
      {
        name: "health.openDays",
        label: "Days the service runs",
        type: "multiselect",
        full: true,
        hint: "The “open / closed today” badge is calculated from this (Bangladesh time). With nothing chosen the badge is not shown.",
        options: [
          { value: "SAT", label: "Saturday" },
          { value: "SUN", label: "Sunday" },
          { value: "MON", label: "Monday" },
          { value: "TUE", label: "Tuesday" },
          { value: "WED", label: "Wednesday" },
          { value: "THU", label: "Thursday" },
          { value: "FRI", label: "Friday" },
        ],
      },
      {
        name: "health.daysPerWeek",
        label: "Days per week (homepage tile; 0 = hidden)",
        type: "number",
      },
      {
        name: "health.sinceYear",
        label: "Since year (homepage tile; 0 = hidden)",
        type: "number",
      },
      {
        name: "health.statsBasePatients",
        label: "Patients to date (base figure)",
        type: "number",
        hint: "The total before daily counting started. Each day’s numbers are added on the Health service → Serials page. 0 hides the tile.",
      },
      {
        name: "health.statsBaseReports",
        label: "Reports to date (base figure)",
        type: "number",
      },
      {
        name: "health.statsBaseConsultations",
        label: "Consultations to date (base figure)",
        type: "number",
      },
      { name: "health.heroImage", label: "Page image", type: "image" },
      {
        name: "health.ogImage",
        label: "Social share card (1200×630, optional)",
        type: "image",
        hint: "Shown when the link is shared on Facebook or WhatsApp. Without it a card with the English tagline is generated (Bangla text cannot be rendered automatically).",
      },
      {
        name: "health.commitmentLabelBn",
        label: "Section label (Bangla)",
        type: "text",
        lang: "bn",
      },
      {
        name: "health.taglineBn",
        label: "Tagline, quoted (Bangla)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.introBn",
        label: "Intro (Bangla)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.goalBn",
        label: "Goal (Bangla)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.closingBn",
        label: "Closing line (Bangla)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.daysBn",
        label: "Days (Bangla, e.g. Saturday to Thursday)",
        type: "text",
        lang: "bn",
      },
      {
        name: "health.timeBn",
        label: "Time (Bangla, e.g. 10 am to 1 pm)",
        type: "text",
        lang: "bn",
      },
      {
        name: "health.holidayNoteBn",
        label: "Holiday note (Bangla)",
        type: "text",
        lang: "bn",
        full: true,
      },
      {
        name: "health.eligibilityBn",
        label: "Who can get it / what to bring (Bangla)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "health.transparencyBn",
        label: "“Please note” text (Bangla)",
        type: "richtext",
        lang: "bn",
      },
      {
        name: "health.supportTextBn",
        label: "Support call (Bangla)",
        type: "textarea",
        lang: "bn",
        full: true,
      },
      {
        name: "health.commitmentLabelEn",
        label: "Section label (English)",
        type: "text",
        lang: "en",
        latin: true,
      },
      {
        name: "health.taglineEn",
        label: "Tagline, quoted (English)",
        type: "textarea",
        lang: "en",
        latin: true,
        full: true,
      },
      {
        name: "health.introEn",
        label: "Intro (English)",
        type: "textarea",
        lang: "en",
        latin: true,
        full: true,
      },
      {
        name: "health.goalEn",
        label: "Goal (English)",
        type: "textarea",
        lang: "en",
        latin: true,
        full: true,
      },
      {
        name: "health.closingEn",
        label: "Closing line (English)",
        type: "textarea",
        lang: "en",
        latin: true,
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
    label: "Footer",
    fields: [
      {
        name: "footer.aboutBn",
        label: "Footer about text (Bangla)",
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

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  defaultSiteSettings,
  siteSettingsSchema,
  type SiteSettings,
} from "@/lib/site-settings-schema";

export {
  defaultSiteSettings,
  siteSettingsSchema,
  type SiteSettings,
} from "@/lib/site-settings-schema";

/**
 * Reads the settings row, merging it over the defaults so a partially filled
 * row (or a brand new database) never breaks a page. Memoised per request.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: 1 } });
    if (!row) return defaultSiteSettings;

    const parsed = siteSettingsSchema.safeParse(row.json);
    if (!parsed.success) {
      console.error("SiteSetting row failed validation, using defaults", parsed.error);
      return defaultSiteSettings;
    }
    return mergeWithDefaults(parsed.data);
  } catch (error) {
    // The public site must still render if the database is briefly unreachable.
    console.error("Could not load site settings", error);
    return defaultSiteSettings;
  }
});

/**
 * Hero slides in display order. The list wins; an older row that only set the
 * single `heroImage` still shows it; nothing set means the placeholder panel.
 */
export function heroSlides(settings: SiteSettings): string[] {
  const list = settings.homepage.heroImages.map((s) => s.trim()).filter(Boolean);
  if (list.length > 0) return list;
  const single = settings.homepage.heroImage.trim();
  return single ? [single] : [];
}

/**
 * Fields the site cannot sensibly render blank: if staff (or an older row)
 * leaves them empty we fall back to the seeded institute facts. Everything
 * else — announcement text, office hours, image paths, analytics IDs — stays
 * exactly as saved, so clearing a field in the admin really clears it.
 */
const NEVER_BLANK: Record<keyof SiteSettings, string[]> = {
  general: ["nameBn", "nameEn", "shortName", "taglineBn", "taglineEn", "govtCode"],
  // Branding is optional everywhere: an empty value falls back to the
  // built-in logo and palette.
  branding: [],
  content: ["eligibilityBn", "eligibilityEn", "documentsNoteBn", "documentsNoteEn"],
  contact: ["addressBn", "addressEn", "phone1", "whatsapp", "email"],
  homepage: ["heroTitleBn", "heroTitleEn", "heroSubBn", "heroSubEn"],
  whatsapp: ["defaultMessageBn", "defaultMessageEn"],
  seo: ["titleBn", "titleEn", "descriptionBn", "descriptionEn"],
  integrations: [],
  footer: ["aboutBn", "aboutEn"],
  security: [],
  results: [],
  hero: [],
  // The seeded TODO copy must reach the admin so the office sees what to
  // replace; a blank field would otherwise hide whole sections silently.
  health: [
    "commitmentLabelBn",
    "commitmentLabelEn",
    "taglineBn",
    "taglineEn",
    "introBn",
    "introEn",
    "goalBn",
    "goalEn",
    "closingBn",
    "closingEn",
    "daysBn",
    "daysEn",
    "timeBn",
    "timeEn",
    "eligibilityBn",
    "eligibilityEn",
    "transparencyBn",
    "transparencyEn",
    "supportTextBn",
    "supportTextEn",
  ],
  advisors: ["categories"],
};

function mergeWithDefaults(settings: SiteSettings): SiteSettings {
  const merged = structuredClone(settings) as SiteSettings;

  for (const groupKey of Object.keys(NEVER_BLANK) as Array<keyof SiteSettings>) {
    const defaults = defaultSiteSettings[groupKey] as Record<string, unknown>;
    const group = merged[groupKey] as Record<string, unknown> | undefined;
    if (!group) {
      (merged as Record<string, unknown>)[groupKey] = structuredClone(defaults);
      continue;
    }

    for (const key of NEVER_BLANK[groupKey]) {
      const value = group[key];
      if (value === "" || value === undefined || value === null) {
        group[key] = defaults[key];
      }
    }
  }

  return merged;
}

/**
 * A favicon is displayed at 16–64px, but the upload pipeline keeps images at
 * up to 1600px — a photo uploaded as a favicon would otherwise be downloaded
 * at full size on every page view. Local uploads are routed through Next's
 * image optimiser at 64px; anything else (an absolute URL, say) is left alone.
 */
export function faviconUrl(settings: SiteSettings): string {
  const favicon = settings.branding.favicon.trim();

  // No upload yet: the institute mark, not the framework's default icon.
  if (!favicon) return "/logo.svg";

  if (!favicon.startsWith("/uploads/")) return favicon;
  return `/_next/image?url=${encodeURIComponent(favicon)}&w=64&q=75`;
}

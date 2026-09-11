import type { LeadSource } from "@/generated/prisma/enums";

/**
 * Lead attribution (addendum 2, A3).
 *
 * The browser captures the campaign parameters on the visitor's first page
 * view and keeps them in a 30-day cookie, because the visitor usually lands on
 * an ad URL and only applies later from a different page. The server actions
 * read that cookie when the form is submitted.
 */

export const LEAD_COOKIE = "muti_lead";
export const LEAD_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/** Campaign parameters worth keeping, all optional. */
export type LeadData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ref?: string;
  /** Where the visitor came from, and the page they first landed on. */
  referrer?: string;
  landing?: string;
  /** ISO timestamp of the first touch. */
  at?: string;
};

const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ref",
] as const;

/**
 * Pulls the tracked parameters out of a query string. Returns null when the
 * URL carries no campaign information at all, so an ordinary visit never
 * overwrites an earlier, more informative first touch.
 */
export function readLeadParams(search: string): LeadData | null {
  const params = new URLSearchParams(search);
  const data: LeadData = {};
  let found = false;

  for (const key of TRACKED_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) {
      data[key] = value.slice(0, 200);
      found = true;
    }
  }

  return found ? data : null;
}

/**
 * Maps campaign data onto the lead source the office reports on.
 * Order matters: a click id is stronger evidence than a utm_source someone
 * may have copied by hand.
 */
export function resolveLeadSource(data: LeadData | null): LeadSource {
  if (!data) return "WEBSITE";

  if (data.fbclid) return "FACEBOOK";
  if (data.gclid) return "GOOGLE";

  const utmSource = data.utm_source?.toLowerCase() ?? "";
  if (utmSource.includes("facebook") || utmSource === "fb" || utmSource === "ig") {
    return "FACEBOOK";
  }
  if (utmSource.includes("google")) return "GOOGLE";

  if (data.ref) return "REFERRAL";

  // A referrer from one of the big platforms, with no tagging at all.
  const referrer = data.referrer?.toLowerCase() ?? "";
  if (referrer.includes("facebook.") || referrer.includes("fb.")) return "FACEBOOK";
  if (referrer.includes("google.")) return "GOOGLE";

  return "WEBSITE";
}

/** The referral code to store, when the visit came through `?ref=`. */
export function referralCodeOf(data: LeadData | null): string | null {
  const code = data?.ref?.trim();
  return code ? code.slice(0, 60) : null;
}

/** Safely parses the cookie value written by the browser. */
export function parseLeadCookie(raw: string | undefined): LeadData | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object") return null;

    // Only keep known keys, and only strings — the cookie is visitor-writable.
    const source = parsed as Record<string, unknown>;
    const data: LeadData = {};
    for (const key of [...TRACKED_PARAMS, "referrer", "landing", "at"] as const) {
      const value = source[key];
      if (typeof value === "string" && value) {
        data[key] = value.slice(0, 300);
      }
    }
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}

export const LEAD_SOURCE_LABELS_BN: Record<LeadSource, string> = {
  FACEBOOK: "ফেসবুক",
  GOOGLE: "গুগল",
  REFERRAL: "রেফারেল",
  WALK_IN: "সরাসরি অফিসে",
  WEBSITE: "ওয়েবসাইট",
  OTHER: "অন্যান্য",
};

"use client";

import { useEffect } from "react";

import {
  LEAD_COOKIE,
  LEAD_COOKIE_MAX_AGE,
  readLeadParams,
  type LeadData,
} from "@/lib/lead-source";

/**
 * Captures campaign parameters on the visitor's first page view and keeps them
 * in a 30-day cookie (addendum 2, A3). Visitors usually arrive on an ad link
 * and apply later from another page, so the attribution has to survive the
 * journey between the two.
 *
 * Renders nothing. Writes a first-party cookie only — no third party is
 * contacted, and the cookie holds campaign tags, not personal data.
 */
export function LeadTracker() {
  useEffect(() => {
    try {
      const fromUrl = readLeadParams(window.location.search);
      const existing = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${LEAD_COOKIE}=`));

      // First touch wins: an untagged visit never overwrites a stored campaign.
      if (!fromUrl && existing) return;

      const data: LeadData = fromUrl ?? {};
      data.landing = `${window.location.pathname}${window.location.search}`.slice(
        0,
        300,
      );
      data.at = new Date().toISOString();

      const referrer = document.referrer;
      if (referrer && !referrer.startsWith(window.location.origin)) {
        data.referrer = referrer.slice(0, 300);
      }

      // No campaign tags and no external referrer: nothing worth storing.
      if (!fromUrl && !data.referrer) return;

      const value = encodeURIComponent(JSON.stringify(data));
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LEAD_COOKIE}=${value}; path=/; max-age=${LEAD_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    } catch {
      // Cookies blocked, or a malformed URL — attribution is best effort.
    }
  }, []);

  return null;
}

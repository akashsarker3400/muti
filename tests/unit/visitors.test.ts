import { describe, expect, it } from "vitest";

import { isBackupKey, isPublicKey, isSafeKey } from "@/lib/storage-key";

/**
 * The pure parts of visitor counting and of the backup keys. `src/lib/visitors.ts`
 * is server-only and reaches for AUTH_SECRET, so the classification rules are
 * re-stated here the way the module defines them.
 */

const IGNORED = /^\/(admin|api|uploads|_next|favicon|robots|sitemap)/;
const BOT =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests/i;

const isCountablePath = (path: string) => path.startsWith("/") && !IGNORED.test(path);
const isBot = (ua: string) => ua === "" || BOT.test(ua);
const deviceOf = (ua: string) =>
  /android|iphone|ipad|ipod|mobile|opera mini/i.test(ua) ? "mobile" : "desktop";

function referrerHostOf(referrer: string | null, self: string) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== self.replace(/^www\./, "") ? host : null;
  } catch {
    return null;
  }
}

describe("what gets counted", () => {
  it("counts public pages in both languages", () => {
    expect(isCountablePath("/")).toBe(true);
    expect(isCountablePath("/courses/cmu")).toBe(true);
    expect(isCountablePath("/bn/blog/echogenicity")).toBe(true);
  });

  it("never counts the admin panel or an asset request", () => {
    // The office looking at its own site all day would drown the numbers.
    expect(isCountablePath("/admin")).toBe(false);
    expect(isCountablePath("/admin/students")).toBe(false);
    expect(isCountablePath("/api/v1/hit")).toBe(false);
    expect(isCountablePath("/uploads/2026-09/a.webp")).toBe(false);
    expect(isCountablePath("/_next/static/chunk.js")).toBe(false);
    expect(isCountablePath("/sitemap.xml")).toBe(false);
  });

  it("drops the obvious crawlers", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe(false);
  });

  it("tells a phone from a computer", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14)")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("desktop");
  });
});

describe("referrer", () => {
  it("keeps the host only, never the path or query", () => {
    expect(referrerHostOf("https://www.google.com/search?q=ultrasound+course", "muti.ac.bd")).toBe(
      "google.com",
    );
    expect(referrerHostOf("https://m.facebook.com/somepost", "muti.ac.bd")).toBe(
      "m.facebook.com",
    );
  });

  it("treats our own pages and a direct visit as no referrer", () => {
    expect(referrerHostOf("https://muti.ac.bd/courses", "muti.ac.bd")).toBeNull();
    expect(referrerHostOf(null, "muti.ac.bd")).toBeNull();
    expect(referrerHostOf("not a url", "muti.ac.bd")).toBeNull();
  });
});

describe("backup keys", () => {
  it("accepts only a key this application named", () => {
    expect(isBackupKey("protected/backups/20260929-031500.dump")).toBe(true);
    expect(isSafeKey("protected/backups/20260929-031500.dump")).toBe(true);
  });

  it("refuses anything else under the backup folder", () => {
    for (const key of [
      "protected/backups/../../.env",
      "protected/backups/anything.dump",
      "protected/backups/20260929-031500.sql",
      "backups/20260929-031500.dump",
    ]) {
      expect(isBackupKey(key), key).toBe(false);
    }
  });

  it("never serves a backup from the public uploads route", () => {
    expect(isPublicKey("protected/backups/20260929-031500.dump")).toBe(false);
  });
});

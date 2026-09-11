import { describe, expect, it } from "vitest";

import {
  parseLeadCookie,
  readLeadParams,
  referralCodeOf,
  resolveLeadSource,
} from "@/lib/lead-source";

describe("readLeadParams", () => {
  it("picks up the tracked parameters", () => {
    const data = readLeadParams(
      "?utm_source=facebook&utm_campaign=admission&fbclid=abc",
    );
    expect(data).toEqual({
      utm_source: "facebook",
      utm_campaign: "admission",
      fbclid: "abc",
    });
  });

  it("returns null for an untagged visit, so a first touch is never lost", () => {
    expect(readLeadParams("")).toBeNull();
    expect(readLeadParams("?page=2")).toBeNull();
  });
});

describe("resolveLeadSource", () => {
  it("trusts a click id over anything else", () => {
    expect(resolveLeadSource({ fbclid: "x", utm_source: "google" })).toBe("FACEBOOK");
    expect(resolveLeadSource({ gclid: "x" })).toBe("GOOGLE");
  });

  it("reads utm_source", () => {
    expect(resolveLeadSource({ utm_source: "facebook" })).toBe("FACEBOOK");
    expect(resolveLeadSource({ utm_source: "FB" })).toBe("FACEBOOK");
    expect(resolveLeadSource({ utm_source: "google_ads" })).toBe("GOOGLE");
  });

  it("treats ?ref= as a referral", () => {
    expect(resolveLeadSource({ ref: "dr-rahim" })).toBe("REFERRAL");
    expect(referralCodeOf({ ref: "dr-rahim" })).toBe("dr-rahim");
    expect(referralCodeOf({})).toBeNull();
  });

  it("falls back to the referring site, then to WEBSITE", () => {
    expect(resolveLeadSource({ referrer: "https://m.facebook.com/x" })).toBe(
      "FACEBOOK",
    );
    expect(resolveLeadSource({ referrer: "https://www.google.com/" })).toBe("GOOGLE");
    expect(resolveLeadSource({ referrer: "https://example.com" })).toBe("WEBSITE");
    expect(resolveLeadSource(null)).toBe("WEBSITE");
  });
});

describe("parseLeadCookie", () => {
  it("reads a cookie the browser wrote", () => {
    const raw = encodeURIComponent(JSON.stringify({ utm_source: "facebook" }));
    expect(parseLeadCookie(raw)).toEqual({ utm_source: "facebook" });
  });

  it("ignores junk — the cookie is visitor-writable", () => {
    expect(parseLeadCookie(undefined)).toBeNull();
    expect(parseLeadCookie("not json")).toBeNull();
    expect(parseLeadCookie(encodeURIComponent(JSON.stringify("nope")))).toBeNull();
    expect(
      parseLeadCookie(encodeURIComponent(JSON.stringify({ evil: "<script>" }))),
    ).toBeNull();
  });

  it("drops unknown keys and keeps only strings", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ utm_source: "google", admin: true, ref: 42 }),
    );
    expect(parseLeadCookie(raw)).toEqual({ utm_source: "google" });
  });
});

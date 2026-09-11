import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatMoney,
  formatNumber,
  pick,
  toBanglaDigits,
  toEnglishDigits,
  yearsOfExperience,
} from "@/lib/format";

describe("Bangla digits", () => {
  it("converts ASCII digits and leaves the rest alone", () => {
    expect(toBanglaDigits("30,750")).toBe("৩০,৭৫০");
    expect(toBanglaDigits(57125)).toBe("৫৭১২৫");
    expect(toBanglaDigits("CMU 2026")).toBe("CMU ২০২৬");
    expect(toBanglaDigits("")).toBe("");
  });

  it("round-trips back to ASCII", () => {
    expect(toEnglishDigits("৩০,৭৫০")).toBe("30,750");
    expect(toEnglishDigits(toBanglaDigits("01778838644"))).toBe("01778838644");
  });
});

describe("money", () => {
  it("uses Bangla digits and the taka sign in Bangla", () => {
    expect(formatMoney(30750, "bn")).toBe("৳ ৩০,৭৫০");
    expect(formatMoney(100000, "bn")).toBe("৳ ১০০,০০০");
  });

  it("uses Tk and ASCII digits in English", () => {
    expect(formatMoney(30750, "en")).toBe("Tk 30,750");
    expect(formatMoney(0, "en")).toBe("Tk 0");
  });
});

describe("numbers and dates", () => {
  it("formats plain numbers per locale", () => {
    expect(formatNumber(16, "bn")).toBe("১৬");
    expect(formatNumber(16, "en")).toBe("16");
  });

  it("formats dates the way the spec shows them", () => {
    const date = new Date("2026-09-12T00:00:00.000Z");
    expect(formatDate(date, "bn")).toBe("১২ সেপ্টেম্বর ২০২৬");
    expect(formatDate(date, "en")).toBe("12 Sep 2026");
  });

  it("returns an empty string for missing or invalid dates", () => {
    expect(formatDate(null, "bn")).toBe("");
    expect(formatDate(undefined, "en")).toBe("");
    expect(formatDate("not a date", "en")).toBe("");
  });

  it("counts years since the institute was established", () => {
    expect(yearsOfExperience(2009, new Date("2026-01-01T00:00:00Z"))).toBe(17);
    expect(yearsOfExperience(2030, new Date("2026-01-01T00:00:00Z"))).toBe(0);
  });
});

describe("pick", () => {
  it("falls back to Bangla when English is empty", () => {
    expect(pick("en", "বাংলা", "")).toBe("বাংলা");
    expect(pick("en", "বাংলা", null)).toBe("বাংলা");
    expect(pick("en", "বাংলা", "English")).toBe("English");
  });

  it("falls back to English when Bangla is empty", () => {
    expect(pick("bn", "", "English")).toBe("English");
    expect(pick("bn", "বাংলা", "English")).toBe("বাংলা");
  });
});

import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/admin/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("CMU (Regular)")).toBe("cmu-regular");
    expect(slugify("  Color  Doppler  ")).toBe("color-doppler");
  });

  it("keeps Bangla letters", () => {
    expect(slugify("ভর্তি চলছে ২০২৬")).toBe("ভর্তি-চলছে-২০২৬");
  });

  it("drops quotes and trims stray hyphens", () => {
    expect(slugify("Director's message —")).toBe("directors-message");
  });

  it("caps the length so URLs stay manageable", () => {
    expect(slugify("a".repeat(200))).toHaveLength(90);
  });
});

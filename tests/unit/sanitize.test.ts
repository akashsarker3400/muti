import { describe, expect, it } from "vitest";

import { isEmptyRichText, sanitizeRichText } from "@/lib/sanitize";

describe("sanitizeRichText", () => {
  it("keeps the formatting the Tiptap toolbar produces", () => {
    const html =
      "<h2>শিরোনাম</h2><p><strong>গাঢ়</strong> ও <em>ইটালিক</em></p><ul><li>এক</li></ul>";
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("strips script tags and inline handlers", () => {
    const clean = sanitizeRichText(
      '<p onclick="steal()">hi</p><script>alert(1)</script>',
    );
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("hi");
  });

  it("removes javascript: URLs but keeps normal links", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain(
      "javascript:",
    );
    expect(sanitizeRichText('<a href="/courses/dmu">DMU</a>')).toContain(
      'href="/courses/dmu"',
    );
  });

  it("opens external links safely", () => {
    const clean = sanitizeRichText('<a href="https://bteb.gov.bd">BTEB</a>');
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it("allows only text alignment through the style attribute", () => {
    expect(sanitizeRichText('<p style="text-align:center">x</p>')).toContain(
      "text-align:center",
    );
    expect(sanitizeRichText('<p style="position:fixed;top:0">x</p>')).not.toContain(
      "position",
    );
  });
});

describe("isEmptyRichText", () => {
  it("treats markup with no visible text as empty", () => {
    expect(isEmptyRichText("")).toBe(true);
    expect(isEmptyRichText(null)).toBe(true);
    expect(isEmptyRichText("<p></p>")).toBe(true);
    expect(isEmptyRichText("<p>&nbsp;</p>")).toBe(true);
    expect(isEmptyRichText("<p>লেখা</p>")).toBe(false);
  });
});

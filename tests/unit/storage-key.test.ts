import { describe, expect, it } from "vitest";

// The guard is pure; import it without pulling the drivers (server-only).
import { isProtectedKey, isPublicKey, isSafeKey } from "@/lib/storage-key";

describe("upload key guard", () => {
  it("accepts the shape the uploader produces", () => {
    expect(isSafeKey("2026-09/ab12cd34ef56ab12cd34ef56.webp")).toBe(true);
    expect(isSafeKey("2026-09/ab12cd34ef56ab12cd34ef56.pdf")).toBe(true);
  });

  it("rejects traversal, nesting and unknown types", () => {
    for (const bad of [
      "../etc/passwd",
      "2026-09/../../x.webp",
      "2026-09/a/b.webp",
      "2026-09/ab.exe",
      "2026-09/ab.webp\0",
      "/2026-09/ab.webp",
      "2026-09/ab cd.webp",
    ]) {
      expect(isSafeKey(bad)).toBe(false);
    }
  });

  it("keeps protected files out of the public route", () => {
    const key = "protected/2026-09/ab12cd34ef56ab12cd34ef56.pdf";
    expect(isSafeKey(key)).toBe(true);
    expect(isProtectedKey(key)).toBe(true);
    expect(isPublicKey(key)).toBe(false);
    expect(isPublicKey("2026-09/ab12cd34ef56ab12cd34ef56.mp4")).toBe(true);
    expect(isProtectedKey("protected/2026-09/ab12.mp4")).toBe(false);
  });
});

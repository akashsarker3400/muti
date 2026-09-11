import { describe, expect, it } from "vitest";

import {
  SAMPLE_TOKEN_TTL_MS,
  signSampleToken,
  verifySampleToken,
} from "@/lib/book-token";

const SECRET = "test-secret";

describe("sample chapter token", () => {
  it("round-trips the application id within 24 hours", () => {
    const token = signSampleToken("cmapp123456789", SECRET, 1_000_000);
    const result = verifySampleToken(token, SECRET, 1_000_000 + 60_000);
    expect(result).toEqual({
      ok: true,
      applicationId: "cmapp123456789",
      expiresAt: 1_000_000 + SAMPLE_TOKEN_TTL_MS,
    });
  });

  it("expires after 24 hours", () => {
    const token = signSampleToken("cmapp123456789", SECRET, 0);
    expect(verifySampleToken(token, SECRET, SAMPLE_TOKEN_TTL_MS + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a tampered or foreign token", () => {
    const token = signSampleToken("cmapp123456789", SECRET);
    const [payload, signature] = token.split(".") as [string, string];
    expect(verifySampleToken(`${payload}x.${signature}`, SECRET).ok).toBe(false);
    expect(verifySampleToken(token, "other-secret").ok).toBe(false);
    expect(verifySampleToken("garbage", SECRET)).toEqual({
      ok: false,
      reason: "malformed",
    });
  });
});

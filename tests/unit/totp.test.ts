import { describe, expect, it } from "vitest";

import {
  currentTotp,
  decryptSecret,
  encryptSecret,
  newBackupCodes,
  newTotpSecret,
  normalizeBackupCode,
  safeEqual,
  totpUri,
  verifyTotp,
} from "@/lib/totp";

const APP_SECRET = "dev-only-secret-change-in-production-0123456789abcdef";

describe("TOTP", () => {
  it("accepts the code an authenticator app would show right now", () => {
    const secret = newTotpSecret();
    expect(verifyTotp(secret, currentTotp(secret))).toBe(true);
  });

  it("tolerates one step of clock drift, but not five minutes", () => {
    const secret = newTotpSecret();
    const now = Date.now();
    expect(verifyTotp(secret, currentTotp(secret, now - 30_000))).toBe(true);
    expect(verifyTotp(secret, currentTotp(secret, now + 30_000))).toBe(true);
    expect(verifyTotp(secret, currentTotp(secret, now - 300_000))).toBe(false);
  });

  it("refuses a wrong code, another account's code and junk", () => {
    const secret = newTotpSecret();
    const other = newTotpSecret();
    expect(verifyTotp(secret, "000000")).toBe(false);
    expect(verifyTotp(secret, currentTotp(other))).toBe(false);
    expect(verifyTotp(secret, "")).toBe(false);
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "abcdef")).toBe(false);
  });

  it("builds a scannable otpauth URI naming the issuer and the account", () => {
    const uri = totpUri(newTotpSecret(), "office@muti.ac.bd");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("issuer=MUTI%20Admin");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("secret storage", () => {
  it("round-trips through encryption", () => {
    const secret = newTotpSecret();
    const stored = encryptSecret(secret, APP_SECRET);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored, APP_SECRET)).toBe(secret);
  });

  it("is useless without the application secret, or if tampered with", () => {
    const stored = encryptSecret(newTotpSecret(), APP_SECRET);
    expect(decryptSecret(stored, "another-secret")).toBeNull();
    expect(decryptSecret(`${stored}x`, APP_SECRET)).toBeNull();
    expect(decryptSecret("not-a-token", APP_SECRET)).toBeNull();
  });

  it("uses a fresh nonce, so two rows never look alike", () => {
    const secret = newTotpSecret();
    expect(encryptSecret(secret, APP_SECRET)).not.toBe(encryptSecret(secret, APP_SECRET));
  });
});

describe("backup codes", () => {
  it("makes ten distinct grouped codes", () => {
    const codes = newBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
  });

  it("types the same with or without the dash", () => {
    expect(normalizeBackupCode("a1b2c-3d4e5")).toBe("A1B2C3D4E5");
    expect(normalizeBackupCode("A1B2C3D4E5")).toBe("A1B2C3D4E5");
  });
});

describe("safeEqual", () => {
  it("compares without leaking length through early exit", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

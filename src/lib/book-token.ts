import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed download tokens for the course book's sample chapter (addendum 5,
 * A4). One token per submission, valid for 24 hours, HMAC-signed with the
 * auth secret so it cannot be forged or guessed. Pure functions: the route
 * and the action share them, and the unit tests exercise them directly.
 */

export const SAMPLE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSampleToken(
  applicationId: string,
  secret: string,
  now: number = Date.now(),
): string {
  const payload = base64url(`${applicationId}.${now + SAMPLE_TOKEN_TTL_MS}`);
  return `${payload}.${sign(payload, secret)}`;
}

export type SampleTokenResult =
  | { ok: true; applicationId: string; expiresAt: number }
  | { ok: false; reason: "malformed" | "signature" | "expired" };

export function verifySampleToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): SampleTokenResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1])
    return { ok: false, reason: "malformed" };
  const [payload, signature] = parts as [string, string];

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature" };
  }

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const dot = decoded.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "malformed" };
  const applicationId = decoded.slice(0, dot);
  const expiresAt = Number(decoded.slice(dot + 1));
  if (!applicationId || !Number.isFinite(expiresAt))
    return { ok: false, reason: "malformed" };
  if (expiresAt < now) return { ok: false, reason: "expired" };
  return { ok: true, applicationId, expiresAt };
}

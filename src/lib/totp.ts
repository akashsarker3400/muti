import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import * as OTPAuth from "otpauth";

/**
 * Two-factor authentication for admin accounts.
 *
 * TOTP (RFC 6238, the scheme Google Authenticator and Authy speak), six
 * digits on a thirty-second step, with one step of clock tolerance each way.
 *
 * The shared secret is the whole security of the second factor, so it is
 * encrypted at rest with AES-256-GCM under a key derived from `AUTH_SECRET`:
 * a stolen database dump is then not enough to mint codes, the attacker also
 * needs the application's secret. Backup codes are bcrypt-hashed by the
 * caller and consumed on use.
 */

const ISSUER = "MUTI Admin";
const DIGITS = 6;
const PERIOD = 30;
/** Accept the neighbouring step: phone clocks drift. */
const WINDOW = 1;

function keyFrom(secret: string): Buffer {
  return createHash("sha256").update(`totp:${secret}`).digest();
}

/** `iv.ciphertext.tag`, all base64url. */
export function encryptSecret(plain: string, appSecret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(appSecret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, body, cipher.getAuthTag()]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSecret(stored: string, appSecret: string): string | null {
  const parts = stored.split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, body, tag] = parts.map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(appSecret), iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(body!), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key or tampered value: indistinguishable, and both mean "no".
    return null;
  }
}

/** A fresh base32 secret for enrolment. */
export function newTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secret: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/** The `otpauth://` address an authenticator app scans. */
export function totpUri(secret: string, email: string): string {
  return totp(secret, email).toString();
}

/** True when `code` is valid now, or one step either side of now. */
export function verifyTotp(secret: string, code: string, label = "admin"): boolean {
  const cleaned = code.replace(/\D/g, "");
  if (cleaned.length !== DIGITS) return false;
  try {
    return totp(secret, label).validate({ token: cleaned, window: WINDOW }) !== null;
  } catch {
    return false;
  }
}

/** The code for a given moment, for tests and for the enrolment check. */
export function currentTotp(secret: string, at: number = Date.now()): string {
  return totp(secret, "admin").generate({ timestamp: at });
}

/**
 * Ten recovery codes, shown once at enrolment. Grouped for readability, since
 * they are typed by someone who has just lost their phone.
 */
export function newBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/** Strips the grouping dash so a code types the same either way. */
export function normalizeBackupCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/** Constant-time compare for anything secret that is not a hash. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

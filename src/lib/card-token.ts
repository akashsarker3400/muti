import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed student-card tokens (see docs/id-card-certificate-proposal.md, stage
 * 4). The QR on a card carries one of these rather than the roll number, so a
 * card cannot be forged by counting upward from a real roll, and the public
 * page it opens can only ever be reached with a card in hand.
 *
 * Unlike the sample-chapter token these do not expire: a card is valid for as
 * long as the record says it is, and that is decided by the page, not the URL.
 */
/**
 * The separator is "~", not ".": the middleware's matcher skips any path that
 * contains a dot (it treats those as files), so a dotted token would never
 * reach the locale rewrite and the page would 404.
 */
const SEPARATOR = "~";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`card:${payload}`).digest("base64url");
}

export function signCardToken(studentId: string, secret: string): string {
  // The id is a cuid, so it is already URL-safe and needs no encoding. Signing
  // the literal id (rather than an encoded copy) means any edit to the token
  // changes what was signed: base64 would silently ignore trailing bits.
  return `${studentId}${SEPARATOR}${sign(studentId, secret)}`;
}

export function verifyCardToken(token: string, secret: string): string | null {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [studentId, signature] = parts as [string, string];
  if (!/^[a-z0-9]{6,64}$/i.test(studentId)) return null;

  const expected = sign(studentId, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return studentId;
}

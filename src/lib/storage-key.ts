/**
 * "2026-09/ab12.webp": one month folder, one random file name, a known
 * extension. Anything else is never looked up or deleted (section 11).
 *
 * Videos (mp4) live beside images. Protected files (the course book's sample
 * chapter, addendum 5 A7) sit under "protected/<month>/<name>.pdf": a valid
 * storage key, but `isPublicKey` refuses it so the public /uploads route
 * never serves it. Only the signed token route reads that prefix.
 */
const PUBLIC = /^[a-z0-9-]+\/[a-z0-9]+\.(webp|jpe?g|png|gif|svg|pdf|mp4)$/i;
const PROTECTED = /^protected\/[a-z0-9-]+\/[a-z0-9]+\.(pdf)$/i;

export function isSafeKey(key: string): boolean {
  return PUBLIC.test(key) || PROTECTED.test(key);
}

export function isPublicKey(key: string): boolean {
  return PUBLIC.test(key);
}

export function isProtectedKey(key: string): boolean {
  return PROTECTED.test(key);
}

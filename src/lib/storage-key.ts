/**
 * "2026-09/ab12.webp": one month folder, one random file name, a known
 * extension. Anything else is never looked up or deleted (section 11).
 */
export function isSafeKey(key: string): boolean {
  return /^[a-z0-9-]+\/[a-z0-9]+\.(webp|jpe?g|png|gif|svg|pdf)$/i.test(key);
}

/** Matches any character in the Bengali Unicode block. */
export const BANGLA = /[ঀ-৿]/;

/**
 * `lang` attribute for a piece of user content. The admin panel is an English
 * page, so Bangla the office typed must be marked `lang="bn"` to get the
 * Bangla font and correct shaping; English text needs no attribute.
 */
export function langOf(text: unknown): "bn" | undefined {
  return typeof text === "string" && BANGLA.test(text) ? "bn" : undefined;
}

/**
 * URL slugs for courses, notices, posts, pages and gallery albums.
 *
 * Bangla letters are kept — Bangla URLs work fine and read better for the
 * institute — while whitespace and punctuation collapse to hyphens.
 *
 * Note the `\p{M}` in the keep-list: Bangla vowel signs and the hasanta are
 * Unicode *marks*, not letters, so matching on `\p{L}` alone would turn
 * "Admission" into "ভর-ত". ZWNJ/ZWJ are kept for the same reason — they hold
 * conjuncts together.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFC")
      .toLowerCase()
      .trim()
      .replace(/['"’]/g, "")
      .replace(/[^\p{L}\p{N}\p{M}‌‍]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90)
      // Slicing can leave a trailing hyphen behind.
      .replace(/-+$/g, "")
  );
}

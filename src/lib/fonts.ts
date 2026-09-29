import {
  Cinzel,
  EB_Garamond,
  Hind_Siliguri,
  Inter,
  Noto_Sans_Bengali,
} from "next/font/google";

/**
 * English is the primary language: Inter is the page font and is the only
 * face preloaded.
 *
 * Bangla uses Hind Siliguri, the face most Bangladeshi sites and newspapers
 * set their body text in: even stroke weight, wide counters, and conjuncts
 * that stay upright at small sizes. Noto Sans Bengali stays registered behind
 * it purely as a glyph fallback. Neither is preloaded — the browser fetches
 * them only where Bangla is actually rendered, which is the /bn routes and
 * any admin content field the office types Bangla into (see the
 * `html[lang="bn"]` and `[lang="bn"]` rules in globals.css).
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
  preload: false,
});

export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
  preload: false,
});

/**
 * Printed documents only (certificate, registration card): Cinzel for the
 * Roman-capital headings a diploma is expected to carry, EB Garamond for the
 * body. Never preloaded and never referenced by a public page, so a visitor
 * downloads neither.
 */
export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display-serif",
  display: "swap",
  preload: false,
});

export const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body-serif",
  display: "swap",
  preload: false,
});

export const fontVariables = `${inter.variable} ${hindSiliguri.variable} ${notoSansBengali.variable}`;

/** Added to the admin <html> so the print pages can use the serif faces. */
export const documentFontVariables = `${cinzel.variable} ${ebGaramond.variable}`;

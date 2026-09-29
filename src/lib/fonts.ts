import { Cinzel, EB_Garamond, Inter, Noto_Sans_Bengali } from "next/font/google";
import localFont from "next/font/local";

/**
 * English is the primary language: Inter is the page font and is the only
 * face preloaded.
 *
 * Bangla uses SolaimanLipi (the owner's choice), self-hosted from
 * src/fonts. It is limited by unicode-range to the Bengali block, the danda
 * and the joiners, so English words inside Bangla text still render in Inter
 * rather than SolaimanLipi's older Latin glyphs. The file has one weight;
 * headings get the browser's synthesized bold. Noto Sans Bengali stays
 * registered behind it purely as a glyph fallback. Neither is preloaded: the
 * browser fetches them only where Bangla is actually rendered, which is the
 * /bn routes, the portal and any admin content field the office types Bangla
 * into (see the `html[lang="bn"]` and `[lang="bn"]` rules in globals.css).
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const solaimanLipi = localFont({
  src: "../fonts/SolaimanLipi.ttf",
  weight: "400",
  variable: "--font-solaiman-lipi",
  display: "swap",
  preload: false,
  declarations: [
    { prop: "unicode-range", value: "U+0964-0965, U+0980-09FF, U+200C-200D, U+25CC" },
    // SolaimanLipi draws Bangla smaller than Inter draws Latin; this evens a
    // mixed line such as "CMU, DMU, ADMU কোর্সে".
    { prop: "size-adjust", value: "110%" },
  ],
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

export const fontVariables = `${inter.variable} ${solaimanLipi.variable} ${notoSansBengali.variable}`;

/** Added to the admin <html> so the print pages can use the serif faces. */
export const documentFontVariables = `${cinzel.variable} ${ebGaramond.variable}`;

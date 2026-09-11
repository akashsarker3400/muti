import { Hind_Siliguri, Inter } from "next/font/google";

/**
 * Bangla is the primary UI language, so Hind Siliguri leads the stack and
 * Inter carries Latin text (course codes, fees, English UI) — section 2 & 4.
 *
 * Only two Bangla weights are loaded and preloaded. The Bengali face carries a
 * large glyph set, and the homepage h1 is the Largest Contentful Paint
 * element: every extra preloaded weight pushes LCP out on a phone. Weight 500
 * and 600 resolve to the nearest available face, which reads fine in Bangla.
 *
 * Inter is deliberately not preloaded — Latin text is a minority on the page
 * and the system fallback is close enough for the first paint.
 */
export const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
  preload: true,
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const fontVariables = `${hindSiliguri.variable} ${inter.variable}`;

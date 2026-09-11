import { Inter, Noto_Sans_Bengali } from "next/font/google";

/**
 * English is the primary language: Inter is the page font and is the only
 * face preloaded. Noto Sans Bengali is registered but not preloaded — the
 * browser fetches it only where Bangla is actually rendered, which is the
 * /bn routes and any admin content field the office types Bangla into
 * (see the `html[lang="bn"]` and `[lang="bn"]` rules in globals.css).
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
  preload: false,
});

export const fontVariables = `${inter.variable} ${notoSansBengali.variable}`;

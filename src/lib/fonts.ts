import { Hind_Siliguri, Inter } from "next/font/google";

/**
 * Bangla is the primary UI language, so Hind Siliguri leads the stack and
 * Inter carries Latin text (course codes, fees, English UI) — section 2 & 4.
 */
export const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const fontVariables = `${hindSiliguri.variable} ${inter.variable}`;

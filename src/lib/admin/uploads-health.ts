import "server-only";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { storage } from "@/lib/storage";

export type MissingFile = { url: string; where: string };

export type UploadsHealth = {
  driver: "r2" | "local";
  writable: boolean;
  /** Referenced paths that are not in storage, with the setting or table each belongs to. */
  missing: MissingFile[];
  checked: number;
};

/**
 * Detects the failure the office cannot see from the browser: a settings
 * row that points at /uploads/… files which no longer exist on the server.
 * That happens when the Coolify volume for /app/uploads is missing and a
 * redeploy wiped the directory — every image on the site 404s at once.
 */
export async function uploadsHealth(): Promise<UploadsHealth> {
  const store = storage();
  const writable = await store.healthy();

  const settings = await getSiteSettings();
  const referenced = new Map<string, string>();
  const add = (value: unknown, where: string) => {
    if (
      typeof value === "string" &&
      value.startsWith("/uploads/") &&
      !referenced.has(value)
    ) {
      referenced.set(value, where);
    }
  };
  add(settings.branding.logo, "সাইট সেটিংস → ব্র্যান্ডিং → লোগো");
  add(settings.branding.favicon, "সাইট সেটিংস → ব্র্যান্ডিং → ফেভিকন");
  add(settings.homepage.heroImage, "সাইট সেটিংস → হোমপেজ → হিরো ছবি (পুরনো একক ঘর)");
  settings.homepage.heroImages.forEach((url, index) =>
    add(url, `সাইট সেটিংস → হোমপেজ → হিরো ছবি (স্লাইডশো) #${index + 1}`),
  );
  add(
    settings.homepage.practicalImage,
    "সাইট সেটিংস → হোমপেজ → প্র্যাকটিক্যাল সেকশনের ছবি",
  );
  add(settings.health.heroImage, "সাইট সেটিংস → স্বাস্থ্যসেবা → পাতার ছবি");
  add(settings.health.ogImage, "সাইট সেটিংস → স্বাস্থ্যসেবা → সোশ্যাল শেয়ার কার্ড");

  // A handful of the most recent uploads from the content tables as well.
  try {
    const [courses, banners, images] = await Promise.all([
      prisma.course.findMany({
        where: { image: { startsWith: "/uploads/" } },
        select: { image: true },
        take: 5,
      }),
      prisma.banner.findMany({
        where: { image: { startsWith: "/uploads/" } },
        select: { image: true },
        take: 5,
      }),
      prisma.galleryImage.findMany({
        select: { url: true },
        orderBy: { id: "desc" },
        take: 5,
      }),
    ]);
    courses.forEach((c) => add(c.image, "কোর্সের ছবি"));
    banners.forEach((b) => add(b.image, "হিরো ব্যানার"));
    images.forEach((i) => add(i.url, "গ্যালারি"));
  } catch {
    // Diagnostics only; never let this break the dashboard.
  }

  const missing: MissingFile[] = [];
  for (const [url, where] of referenced) {
    if (!(await store.exists(url.replace(/^\/uploads\//, ""))))
      missing.push({ url, where });
  }

  return { driver: store.name, writable, missing, checked: referenced.size };
}

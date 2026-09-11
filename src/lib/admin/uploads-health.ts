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
  add(settings.branding.logo, "Site settings → Branding → Logo");
  add(settings.branding.favicon, "Site settings → Branding → Favicon");
  add(
    settings.homepage.heroImage,
    "Site settings → Homepage → Hero image (legacy single field)",
  );
  settings.homepage.heroImages.forEach((url, index) =>
    add(url, `Site settings → Homepage → Hero images (slideshow) #${index + 1}`),
  );
  add(
    settings.homepage.practicalImage,
    "Site settings → Homepage → Practical section image",
  );
  add(settings.health.heroImage, "Site settings → Health service → Page image");
  add(settings.health.ogImage, "Site settings → Health service → Social share card");

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
    courses.forEach((c) => add(c.image, "Course image"));
    banners.forEach((b) => add(b.image, "Hero banners"));
    images.forEach((i) => add(i.url, "Gallery"));
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

import "server-only";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { storage } from "@/lib/storage";

export type UploadsHealth = {
  driver: "r2" | "local";
  writable: boolean;
  /** Paths the site references that are not on disk — the sign of a lost volume. */
  missing: string[];
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
  const referenced = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("/uploads/"))
      referenced.add(value);
  };
  add(settings.branding.logo);
  add(settings.branding.favicon);
  add(settings.homepage.heroImage);
  settings.homepage.heroImages.forEach(add);
  add(settings.homepage.practicalImage);
  add(settings.health.heroImage);

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
    courses.forEach((c) => add(c.image));
    banners.forEach((b) => add(b.image));
    images.forEach((i) => add(i.url));
  } catch {
    // Diagnostics only; never let this break the dashboard.
  }

  const missing: string[] = [];
  for (const url of referenced) {
    if (!(await store.exists(url.replace(/^\/uploads\//, "")))) missing.push(url);
  }

  return { driver: store.name, writable, missing, checked: referenced.size };
}

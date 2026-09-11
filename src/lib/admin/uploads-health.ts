import "server-only";

import { access, constants, stat } from "node:fs/promises";
import path from "node:path";

import { uploadDir } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export type UploadsHealth = {
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
  let writable = true;
  try {
    await access(uploadDir, constants.W_OK);
  } catch {
    writable = false;
  }

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
    const file = path.join(uploadDir, url.replace(/^\/uploads\//, ""));
    try {
      await stat(file);
    } catch {
      missing.push(url);
    }
  }

  return { writable, missing, checked: referenced.size };
}

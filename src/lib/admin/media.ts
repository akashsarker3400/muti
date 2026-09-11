import "server-only";

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { uploadDir } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Media library (section 7.13). Files live on the uploads volume rather than
 * in a database table, so the listing walks the directory and cross-references
 * every column that can hold an upload path to work out what is still in use.
 */

export type MediaFile = {
  /** Public path, e.g. "/uploads/2026-09/ab12.webp" */
  url: string;
  name: string;
  size: number;
  modified: string;
  isImage: boolean;
  used: boolean;
};

export async function listMedia(): Promise<MediaFile[]> {
  const root = path.resolve(uploadDir);
  const files: Array<{ url: string; name: string; size: number; modified: Date }> = [];

  async function walk(directory: string, prefix: string) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      // The volume may not exist yet on a brand new deployment.
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(full, `${prefix}/${entry.name}`);
        continue;
      }

      const info = await stat(full);
      files.push({
        url: `${prefix}/${entry.name}`,
        name: entry.name,
        size: info.size,
        modified: info.mtime,
      });
    }
  }

  await walk(root, "/uploads");

  const referenced = await referencedUrls();

  return files
    .sort((a, b) => b.modified.getTime() - a.modified.getTime())
    .map((file) => ({
      url: file.url,
      name: file.name,
      size: file.size,
      modified: file.modified.toISOString(),
      isImage: /\.(webp|jpe?g|png|gif|svg)$/i.test(file.name),
      used: referenced.has(file.url),
    }));
}

/** Every upload path currently referenced by a database row. */
async function referencedUrls(): Promise<Set<string>> {
  const used = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("/uploads/")) {
      used.add(value);
    }
  };

  const [
    courses,
    faculty,
    testimonials,
    partners,
    banners,
    downloads,
    posts,
    albums,
    images,
    results,
    notices,
    settings,
  ] = await Promise.all([
    prisma.course.findMany({ select: { image: true } }),
    prisma.faculty.findMany({ select: { photo: true } }),
    prisma.testimonial.findMany({ select: { photo: true } }),
    prisma.partner.findMany({ select: { logo: true } }),
    prisma.banner.findMany({ select: { image: true } }),
    prisma.download.findMany({ select: { fileUrl: true } }),
    prisma.post.findMany({ select: { cover: true, bodyBn: true, bodyEn: true } }),
    prisma.galleryAlbum.findMany({ select: { cover: true } }),
    prisma.galleryImage.findMany({ select: { url: true } }),
    prisma.result.findMany({ select: { fileUrl: true, bodyHtml: true } }),
    prisma.notice.findMany({
      select: { attachments: true, bodyBn: true, bodyEn: true },
    }),
    prisma.siteSetting.findUnique({ where: { id: 1 } }),
  ]);

  courses.forEach((row) => add(row.image));
  faculty.forEach((row) => add(row.photo));
  testimonials.forEach((row) => add(row.photo));
  partners.forEach((row) => add(row.logo));
  banners.forEach((row) => add(row.image));
  downloads.forEach((row) => add(row.fileUrl));
  albums.forEach((row) => add(row.cover));
  images.forEach((row) => add(row.url));

  // Rich text can embed uploads, so scan the HTML too.
  const scanHtml = (html: string | null) => {
    if (!html) return;
    for (const match of html.matchAll(/\/uploads\/[\w./-]+/g)) add(match[0]);
  };

  posts.forEach((row) => {
    add(row.cover);
    scanHtml(row.bodyBn);
    scanHtml(row.bodyEn);
  });
  results.forEach((row) => {
    add(row.fileUrl);
    scanHtml(row.bodyHtml);
  });
  notices.forEach((row) => {
    scanHtml(row.bodyBn);
    scanHtml(row.bodyEn);
    if (Array.isArray(row.attachments)) {
      for (const attachment of row.attachments) {
        if (attachment && typeof attachment === "object" && "url" in attachment) {
          add((attachment as { url: unknown }).url);
        }
      }
    }
  });

  if (settings?.json && typeof settings.json === "object") {
    // Settings hold hero/practical/OG image paths in a nested object.
    scanHtml(JSON.stringify(settings.json));
  }

  return used;
}

import "server-only";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/**
 * Media library (section 7.13). Files live in storage (R2 or the uploads
 * volume) rather than in a database table, so the listing asks the storage
 * driver and cross-references every column that can hold an upload path to
 * work out what is still in use.
 */

export type MediaFile = {
  /** Public path, e.g. "/uploads/2026-09/ab12.webp" */
  url: string;
  name: string;
  size: number;
  modified: string;
  isImage: boolean;
  isVideo: boolean;
  used: boolean;
  /** "video", "poster", "protected" … from the Media table, when recorded. */
  tag: string | null;
  /** Never served publicly (the course book sample); deleted from its own page. */
  protected: boolean;
};

export async function listMedia(): Promise<MediaFile[]> {
  const files = (await storage().list()).map((file) => ({
    key: file.key,
    url: `/uploads/${file.key}`,
    name: file.key.split("/").pop() ?? file.key,
    size: file.size,
    modified: file.modified,
  }));

  const [referenced, rows] = await Promise.all([
    referencedUrls(),
    prisma.media.findMany({ select: { key: true, tag: true, protected: true } }),
  ]);
  const meta = new Map(rows.map((row) => [row.key, row]));

  return files
    .sort((a, b) => b.modified.getTime() - a.modified.getTime())
    .map((file) => {
      const row = meta.get(file.key);
      return {
        url: file.url,
        name: file.name,
        size: file.size,
        modified: file.modified.toISOString(),
        isImage: /\.(webp|jpe?g|png|gif|svg)$/i.test(file.name),
        isVideo: /\.mp4$/i.test(file.name),
        used: referenced.has(file.url) || Boolean(row),
        tag: row?.tag ?? null,
        protected: row?.protected ?? file.key.startsWith("protected/"),
      };
    });
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
    promos,
    videos,
    books,
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
    prisma.promo.findMany({ select: { image: true, mobileImage: true } }),
    prisma.siteVideo.findMany({ select: { posterImage: true } }),
    prisma.courseBook.findMany({ select: { coverImage: true } }),
  ]);

  promos.forEach((row) => {
    add(row.image);
    add(row.mobileImage);
  });
  videos.forEach((row) => add(row.posterImage));
  books.forEach((row) => add(row.coverImage));
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

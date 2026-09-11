import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Static public routes, mirrored for both locales (section 10). */
const STATIC_PATHS = [
  { path: "", priority: 1 },
  { path: "/courses", priority: 0.9 },
  { path: "/admission", priority: 0.9 },
  { path: "/apply", priority: 0.8 },
  { path: "/free-class", priority: 0.8 },
  { path: "/about", priority: 0.7 },
  { path: "/accreditation", priority: 0.7 },
  { path: "/faculty", priority: 0.6 },
  { path: "/notices", priority: 0.7 },
  { path: "/results", priority: 0.5 },
  { path: "/verify", priority: 0.5 },
  { path: "/gallery", priority: 0.5 },
  { path: "/blog", priority: 0.6 },
  { path: "/faq", priority: 0.7 },
  { path: "/downloads", priority: 0.5 },
  { path: "/contact", priority: 0.8 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, notices, posts] = await Promise.all([
    prisma.course
      .findMany({ where: { published: true }, select: { slug: true, updatedAt: true } })
      .catch(() => []),
    prisma.notice
      .findMany({
        where: { published: true, publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.post
      .findMany({
        where: { published: true, publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  function add(path: string, priority: number, lastModified?: Date) {
    entries.push({
      url: `${siteUrl}${path || "/"}`,
      lastModified,
      priority,
      alternates: {
        languages: {
          en: `${siteUrl}${path || "/"}`,
          bn: `${siteUrl}/bn${path}`,
          "x-default": `${siteUrl}${path || "/"}`,
        },
      },
    });
  }

  for (const entry of STATIC_PATHS) {
    add(entry.path, entry.priority);
  }
  for (const course of courses) {
    add(`/courses/${course.slug}`, 0.9, course.updatedAt);
  }
  for (const notice of notices) {
    add(`/notices/${notice.slug}`, 0.6, notice.updatedAt);
  }
  for (const post of posts) {
    add(`/blog/${post.slug}`, 0.6, post.updatedAt);
  }

  return entries;
}

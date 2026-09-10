import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Read-only queries used by the public site. Each one is wrapped in React's
 * `cache` so a page that needs the same list in two places (header nav and
 * footer, for example) only hits Postgres once per request.
 */

/** Courses shown in nav, grids and selects — published only, in admin order. */
export const getPublishedCourses = cache(async () => {
  try {
    return await prisma.course.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error("getPublishedCourses failed", error);
    return [];
  }
});

export type PublicCourse = Awaited<ReturnType<typeof getPublishedCourses>>[number];

export const getCourseBySlug = cache(async (slug: string) => {
  return prisma.course.findFirst({
    where: { slug, published: true },
    include: {
      routines: { orderBy: { sortOrder: "asc" } },
      faqs: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
});

/** The earliest upcoming published batch — drives the homepage CTA (7.4). */
export const getNextBatch = cache(async () => {
  try {
    return await prisma.batch.findFirst({
      where: { published: true, status: "UPCOMING" },
      include: { course: true },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error("getNextBatch failed", error);
    return null;
  }
});

/** Upcoming batches for the "preferred batch" select on /apply. */
export const getUpcomingBatches = cache(async () => {
  try {
    return await prisma.batch.findMany({
      where: { published: true, status: { in: ["UPCOMING", "RUNNING"] } },
      include: { course: true },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error("getUpcomingBatches failed", error);
    return [];
  }
});

/**
 * Notices that are published and not expired, pinned first (section 5.10).
 * `take` is used by the homepage (5) and the list page (page size).
 */
export const getNotices = cache(
  async ({ take, skip = 0 }: { take?: number; skip?: number } = {}) => {
    try {
      return await prisma.notice.findMany({
        where: {
          published: true,
          publishedAt: { lte: new Date() },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take,
        skip,
      });
    } catch (error) {
      console.error("getNotices failed", error);
      return [];
    }
  },
);

export const countNotices = cache(async () => {
  try {
    return await prisma.notice.count({
      where: {
        published: true,
        publishedAt: { lte: new Date() },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  } catch (error) {
    console.error("countNotices failed", error);
    return 0;
  }
});

export const getNoticeBySlug = cache(async (slug: string) => {
  return prisma.notice.findFirst({
    where: {
      slug,
      published: true,
      publishedAt: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
});

export const getFaculty = cache(async (take?: number) => {
  try {
    return await prisma.faculty.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take,
    });
  } catch (error) {
    console.error("getFaculty failed", error);
    return [];
  }
});

export const getTestimonials = cache(async (take?: number) => {
  try {
    return await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take,
    });
  } catch (error) {
    console.error("getTestimonials failed", error);
    return [];
  }
});

export const getPartners = cache(async () => {
  try {
    return await prisma.partner.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    console.error("getPartners failed", error);
    return [];
  }
});

export const getGalleryAlbums = cache(async () => {
  try {
    return await prisma.galleryAlbum.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
  } catch (error) {
    console.error("getGalleryAlbums failed", error);
    return [];
  }
});

/** Flat list of the newest gallery images for the homepage preview strip. */
export const getGalleryPreview = cache(async (take = 8) => {
  try {
    return await prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take,
      include: { album: true },
    });
  } catch (error) {
    console.error("getGalleryPreview failed", error);
    return [];
  }
});

/** Global FAQ entries (not attached to a specific course). */
export const getGlobalFaqs = cache(async () => {
  try {
    return await prisma.faq.findMany({
      where: { published: true, courseId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error("getGlobalFaqs failed", error);
    return [];
  }
});

export const getDownloads = cache(async () => {
  try {
    return await prisma.download.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  } catch (error) {
    console.error("getDownloads failed", error);
    return [];
  }
});

export const getResults = cache(async () => {
  try {
    return await prisma.result.findMany({
      where: { published: true },
      orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
      include: { batch: true, course: true },
    });
  } catch (error) {
    console.error("getResults failed", error);
    return [];
  }
});

export const getPosts = cache(async (take?: number) => {
  try {
    return await prisma.post.findMany({
      where: { published: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take,
    });
  } catch (error) {
    console.error("getPosts failed", error);
    return [];
  }
});

export const getPostBySlug = cache(async (slug: string) => {
  return prisma.post.findFirst({
    where: { slug, published: true, publishedAt: { lte: new Date() } },
  });
});

export const getPageBySlug = cache(async (slug: string) => {
  try {
    return await prisma.page.findFirst({ where: { slug, published: true } });
  } catch (error) {
    console.error("getPageBySlug failed", error);
    return null;
  }
});

export const getBanners = cache(async () => {
  try {
    return await prisma.banner.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.error("getBanners failed", error);
    return [];
  }
});

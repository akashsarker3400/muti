import { cache } from "react";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

/**
 * Batch reads carry the live seat counter, which changes as the office admits
 * students. They are cached for 60 seconds under the `batches` tag (addendum
 * 2, A1); every admin write that touches a batch calls
 * `revalidateTag("batches")`, so a correction shows up immediately while a
 * burst of visitors does not hit Postgres once per page view.
 */
export const BATCHES_TAG = "batches";

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

const nextBatchCached = unstable_cache(
  async () =>
    prisma.batch.findFirst({
      where: { published: true, status: "UPCOMING" },
      include: { course: true },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    }),
  ["next-batch"],
  { tags: [BATCHES_TAG], revalidate: 60 },
);

/** The earliest upcoming published batch — drives the homepage CTA (7.4). */
export const getNextBatch = cache(async () => {
  try {
    return await nextBatchCached();
  } catch (error) {
    console.error("getNextBatch failed", error);
    return null;
  }
});

const upcomingByCourseCached = unstable_cache(
  async () =>
    prisma.batch.findMany({
      where: { published: true, status: "UPCOMING" },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        courseId: true,
        seats: true,
        seatsFilled: true,
        showSeatCounter: true,
        startDate: true,
      },
    }),
  ["upcoming-batches-by-course"],
  { tags: [BATCHES_TAG], revalidate: 60 },
);

export type CourseBatch = Awaited<ReturnType<typeof upcomingByCourseCached>>[number];

/**
 * The next upcoming batch for each course, keyed by course id — used by the
 * course cards and the course detail header to show seats left.
 */
export const getNextBatchByCourse = cache(async () => {
  const map = new Map<string, CourseBatch>();

  try {
    for (const batch of await upcomingByCourseCached()) {
      // The list is already ordered, so the first one wins.
      if (!map.has(batch.courseId)) map.set(batch.courseId, batch);
    }
  } catch (error) {
    console.error("getNextBatchByCourse failed", error);
  }

  return map;
});

const upcomingBatchesCached = unstable_cache(
  async () =>
    prisma.batch.findMany({
      where: { published: true, status: { in: ["UPCOMING", "RUNNING"] } },
      include: { course: true },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    }),
  ["upcoming-batches"],
  { tags: [BATCHES_TAG], revalidate: 60 },
);

/** Upcoming batches for the "preferred batch" select on /apply. */
export const getUpcomingBatches = cache(async () => {
  try {
    return await upcomingBatchesCached();
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

export const getPartners = cache(
  async (
    types: Array<"AFFILIATION" | "COLLABORATION" | "COMMUNITY"> = [
      "AFFILIATION",
      "COLLABORATION",
    ],
  ) => {
    try {
      return await prisma.partner.findMany({
        where: { type: { in: types } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    } catch (error) {
      console.error("getPartners failed", error);
      return [];
    }
  },
);

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

/**
 * Hero slides (addendum 3, §6): active, inside their schedule window, at most
 * five. The list is refreshed every minute so a scheduled banner appears on
 * time without a redeploy.
 */
export const getBanners = cache(async () => {
  try {
    const now = new Date();
    return await prisma.banner.findMany({
      where: {
        active: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: "asc" },
      take: 5,
    });
  } catch (error) {
    console.error("getBanners failed", error);
    return [];
  }
});

/* ---- Addendum 3 §4–5 --------------------------------------------------- */

export const getLeadershipMessages = cache(async () => {
  try {
    return await prisma.leadershipMessage.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.error("getLeadershipMessages failed", error);
    return [];
  }
});

export const getLeadershipMessage = cache(async (key: string) => {
  try {
    return await prisma.leadershipMessage.findFirst({
      where: { key: key.toLowerCase(), published: true },
    });
  } catch (error) {
    console.error("getLeadershipMessage failed", error);
    return null;
  }
});

export const getAdvisors = cache(async (take?: number) => {
  try {
    return await prisma.advisor.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take,
    });
  } catch (error) {
    console.error("getAdvisors failed", error);
    return [];
  }
});

/* ---- Homepage additions: promos and videos ------------------------------ */

/** Active promos in one slot, inside their schedule window, in admin order. */
export const getPromos = cache(async (slot: "PROMO_A" | "PROMO_B") => {
  try {
    const now = new Date();
    return await prisma.promo.findMany({
      where: {
        slot,
        active: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 5,
    });
  } catch (error) {
    console.error("getPromos failed", error);
    return [];
  }
});

export type PublicPromo = Awaited<ReturnType<typeof getPromos>>[number];

/** The promo (if any) that pops up once per visitor; the first one wins. */
export const getPopupPromo = cache(async () => {
  try {
    const now = new Date();
    return await prisma.promo.findFirst({
      where: {
        active: true,
        showAsPopup: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("getPopupPromo failed", error);
    return null;
  }
});

const videoInclude = { file: true, poster: true } as const;

/** Published videos for one placement (homepage takes the first showOnHome). */
export const getVideos = cache(async (placement?: "HOME" | "ABOUT" | "HEALTH") => {
  try {
    return await prisma.siteVideo.findMany({
      where: { published: true, ...(placement ? { placement } : {}) },
      include: videoInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("getVideos failed", error);
    return [];
  }
});

export type PublicVideo = Awaited<ReturnType<typeof getVideos>>[number];

export const getHomeVideo = cache(async () => {
  try {
    return await prisma.siteVideo.findFirst({
      where: { published: true, showOnHome: true },
      include: videoInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("getHomeVideo failed", error);
    return null;
  }
});

/* ---- Addendum 5: course book --------------------------------------------- */

const bookInclude = {
  chapters: { orderBy: [{ sortOrder: "asc" as const }, { number: "asc" as const }] },
  courses: { include: { course: { select: { id: true, slug: true, code: true } } } },
};

/** The published course book by slug, with chapters and linked courses. */
export const getCourseBook = cache(async (slug: string) => {
  try {
    return await prisma.courseBook.findFirst({
      where: { slug, published: true },
      include: bookInclude,
    });
  } catch (error) {
    console.error("getCourseBook failed", error);
    return null;
  }
});

export type PublicCourseBook = NonNullable<Awaited<ReturnType<typeof getCourseBook>>>;

/** The published book a course uses, for the course page section. */
export const getCourseBookForCourse = cache(async (courseId: string) => {
  try {
    return await prisma.courseBook.findFirst({
      where: { published: true, courses: { some: { courseId } } },
      include: bookInclude,
    });
  } catch (error) {
    console.error("getCourseBookForCourse failed", error);
    return null;
  }
});

/** The first published book, for the homepage strip and the nav. */
export const getFeaturedCourseBook = cache(async () => {
  try {
    return await prisma.courseBook.findFirst({
      where: { published: true },
      include: bookInclude,
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("getFeaturedCourseBook failed", error);
    return null;
  }
});

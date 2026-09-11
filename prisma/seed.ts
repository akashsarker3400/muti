import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { defaultSiteSettings } from "../src/lib/site-settings-schema";
import {
  certificatesOffered,
  paymentPolicy,
  requiredDocuments,
  whyChooseMuti,
  healthServices,
} from "../src/lib/content";
import {
  eligibility,
  seedCourses,
  seedFaqs,
  seedNotices,
  seedPages,
  seedPartners,
  seedLeadership,
  seedBanners,
  seedPosts,
} from "./seed-data";
import { seedBookPosts, seedChapters, seedCourseBook } from "./seed-book";

/**
 * Idempotent seed (section 8). Safe to re-run: it upserts by natural key, so a
 * redeploy never duplicates rows and never overwrites content staff have
 * edited in the admin panel — except for rows that do not exist yet.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "! ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user creation.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`· admin user ${email} already exists`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "MUTI Admin",
      // bcrypt cost 12 per section 11.
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`+ admin user ${email}`);
}

async function seedSettings() {
  const existing = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (existing) {
    console.log("· site settings row already exists");
    return;
  }

  await prisma.siteSetting.create({
    data: { id: 1, json: defaultSiteSettings },
  });
  console.log("+ site settings");
}

async function seedCoursesAndRoutines() {
  for (const course of seedCourses) {
    const { routines, ...data } = course;

    const record = await prisma.course.upsert({
      where: { code: data.code },
      update: {},
      create: {
        ...data,
        eligibilityBn: `<p>${eligibility.bn}</p>`,
        eligibilityEn: `<p>${eligibility.en}</p>`,
        metaTitle: `${data.nameEn} — ${data.fullNameEn} | MUTI`,
        metaDescription: `${data.fullNameEn} at Mymensingh Ultrasound Training Institute. Government approved institute, code 57125. Hands-on training on real patients.`,
      },
    });

    const routineCount = await prisma.courseRoutine.count({
      where: { courseId: record.id },
    });
    if (routineCount > 0) {
      console.log(`· ${data.code}: ${routineCount} routine rows already present`);
      continue;
    }

    if (routines.length > 0) {
      await prisma.courseRoutine.createMany({
        data: routines.map((routine, index) => ({
          courseId: record.id,
          semester: routine.semester ?? null,
          label: routine.label,
          title: routine.title,
          type: routine.type,
          sortOrder: (index + 1) * 10,
        })),
      });
    }
    console.log(`+ ${data.code} (${routines.length} routine rows)`);
  }
}

async function seedBatches() {
  // One UPCOMING batch each for CMU-BTEB, CMU and DMU (section 8).
  // TODO: real start dates were not provided — left null, the UI shows
  // "Starting soon".
  for (const code of ["CMU-BTEB", "CMU", "DMU"]) {
    const course = await prisma.course.findUnique({ where: { code } });
    if (!course) continue;

    const name = `${code} Batch, Session 2026`;
    const existing = await prisma.batch.findFirst({
      where: { courseId: course.id, name },
    });
    if (existing) {
      console.log(`· batch ${name} already exists`);
      continue;
    }

    await prisma.batch.create({
      data: {
        courseId: course.id,
        name,
        startDate: null,
        status: "UPCOMING",
        published: true,
      },
    });
    console.log(`+ batch ${name}`);
  }
}

async function seedPartnerRows() {
  for (const partner of seedPartners) {
    const existing = await prisma.partner.findFirst({
      where: { name: partner.name },
    });
    if (existing) continue;
    // TODO: partner logos not supplied — the UI falls back to name initials.
    await prisma.partner.create({ data: partner });
    console.log(`+ partner ${partner.name}`);
  }
}

async function seedLeadershipRows() {
  for (const row of seedLeadership) {
    const existing = await prisma.leadershipMessage.findUnique({
      where: { key: row.key },
    });
    if (existing) continue;
    await prisma.leadershipMessage.create({ data: row });
    console.log(`+ leadership ${row.key} (unpublished)`);
  }
}

async function seedBannerRows() {
  if ((await prisma.banner.count()) > 0) return;
  await prisma.banner.createMany({ data: seedBanners });
  console.log(`+ ${seedBanners.length} hero banners`);
}

async function seedFaqRows() {
  for (const faq of seedFaqs) {
    const existing = await prisma.faq.findFirst({
      where: { questionBn: faq.questionBn },
    });
    if (existing) continue;
    await prisma.faq.create({ data: faq });
    console.log(`+ faq ${faq.questionBn}`);
  }
}

async function seedNoticeRows() {
  for (const notice of seedNotices) {
    await prisma.notice.upsert({
      where: { slug: notice.slug },
      update: {},
      create: { ...notice, published: true },
    });
  }
  console.log(`+ ${seedNotices.length} notices ensured`);
}

async function seedPageRows() {
  for (const page of seedPages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log(`+ ${seedPages.length} pages ensured`);
}

async function seedPostRows() {
  for (const post of seedPosts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      // Drafts: published stays false until the owner writes the article.
      create: { ...post, published: false, publishedAt: null },
    });
  }
  console.log(`+ ${seedPosts.length} draft posts ensured`);
}

/**
 * The fixed lists the office can edit from the admin panel. They are seeded
 * from src/lib/content.ts, which stays the canonical source of the wording in
 * the build spec (section 3).
 */
async function seedContentItems() {
  const existing = await prisma.contentItem.count();
  if (existing > 0) {
    console.log(`· ${existing} content items already present`);
    return;
  }

  const rows: Array<{
    kind:
      | "WHY_CHOOSE"
      | "DOCUMENT"
      | "PAYMENT_POLICY"
      | "ADMISSION_STEP"
      | "VALUE"
      | "CERTIFICATE"
      | "HEALTH_SERVICE";
    icon?: string | null;
    titleBn?: string | null;
    titleEn?: string | null;
    bodyBn: string;
    bodyEn: string;
    sortOrder: number;
  }> = [];

  whyChooseMuti.forEach((item, index) =>
    rows.push({
      kind: "WHY_CHOOSE",
      icon: item.icon,
      bodyBn: item.bn,
      bodyEn: item.en,
      sortOrder: (index + 1) * 10,
    }),
  );

  requiredDocuments.forEach((item, index) =>
    rows.push({
      kind: "DOCUMENT",
      bodyBn: item.bn,
      bodyEn: item.en,
      sortOrder: (index + 1) * 10,
    }),
  );

  paymentPolicy.forEach((item, index) =>
    rows.push({
      kind: "PAYMENT_POLICY",
      bodyBn: item.bn,
      bodyEn: item.en,
      sortOrder: (index + 1) * 10,
    }),
  );

  const steps: Array<[string, string, string, string]> = [
    [
      "WhatsApp করুন বা অফিসে আসুন",
      "WhatsApp us or visit the office",
      "কোর্স, ফি ও ব্যাচ সম্পর্কে জেনে নিন।",
      "Ask about courses, fees and the upcoming batch.",
    ],
    [
      "ফ্রি ক্লাস করুন",
      "Attend a free class",
      "ভর্তির আগে একটি ক্লাস ফ্রি করে দেখে নিন।",
      "See a real class before you decide to enrol.",
    ],
    [
      "কাগজপত্র ও ৫০% ফি জমা দিন",
      "Submit documents and 50% of the fee",
      "স্ক্যান কপি ও হার্ড কপি অফিসে জমা দিয়ে আসন নিশ্চিত করুন।",
      "Hand in scan copies plus hard copies at the office to confirm your seat.",
    ],
    [
      "ক্লাস শুরু করুন",
      "Start your classes",
      "ব্যাচের সাথে ক্লাস ও রিয়েল পেশেন্ট প্র্যাকটিস শুরু।",
      "Join the batch and begin real-patient practice.",
    ],
  ];
  steps.forEach(([titleBn, titleEn, bodyBn, bodyEn], index) =>
    rows.push({
      kind: "ADMISSION_STEP",
      titleBn,
      titleEn,
      bodyBn,
      bodyEn,
      sortOrder: (index + 1) * 10,
    }),
  );

  const values: Array<[string, string, string, string]> = [
    [
      "লক্ষ্য",
      "Mission",
      "হাতে-কলমে, রিয়েল পেশেন্ট ভিত্তিক শিক্ষার মাধ্যমে দক্ষ ও আত্মবিশ্বাসী সোনোলজিস্ট তৈরি করা।",
      "Train competent, confident sonologists through hands-on, real-patient education.",
    ],
    [
      "দৃষ্টিভঙ্গি",
      "Vision",
      "উত্তর ও মধ্য বাংলাদেশের সবচেয়ে নির্ভরযোগ্য আল্ট্রাসাউন্ড প্রশিক্ষণ প্রতিষ্ঠান হয়ে ওঠা।",
      "Be the most trusted ultrasound training institute in northern and central Bangladesh.",
    ],
    [
      "মূল্যবোধ",
      "Values",
      "রোগীর নিরাপত্তা, একাডেমিক মান, মেন্টরশিপ এবং আজীবন শেখা।",
      "Patient safety, academic rigour, mentorship, lifelong learning.",
    ],
  ];
  values.forEach(([titleBn, titleEn, bodyBn, bodyEn], index) =>
    rows.push({
      kind: "VALUE",
      titleBn,
      titleEn,
      bodyBn,
      bodyEn,
      sortOrder: (index + 1) * 10,
    }),
  );

  certificatesOffered.forEach((item, index) =>
    rows.push({
      kind: "CERTIFICATE",
      bodyBn: item.bn,
      bodyEn: item.en,
      sortOrder: (index + 1) * 10,
    }),
  );

  healthServices.forEach((item, index) =>
    rows.push({
      kind: "HEALTH_SERVICE",
      icon: item.icon,
      bodyBn: item.bn,
      bodyEn: item.en,
      sortOrder: (index + 1) * 10,
    }),
  );

  await prisma.contentItem.createMany({ data: rows });
  console.log(`+ ${rows.length} content items`);
}

/**
 * Course book (addendum 5, A2) and the eight blog drafts written from it
 * (A5). Runs on every deploy, not only on a fresh install, because the live
 * site already existed when the addendum arrived. Upserts never touch what
 * the office has edited: existing rows are left as they are.
 */
async function seedCourseBookRows() {
  const courses = await prisma.course.findMany({
    where: { code: { in: seedCourseBook.courseCodes } },
    select: { id: true },
  });
  const { courseCodes, ...bookData } = seedCourseBook;
  void courseCodes;

  const book = await prisma.courseBook.upsert({
    where: { slug: seedCourseBook.slug },
    update: {},
    // Unpublished until the owner uploads the cover and the sample PDF.
    create: { ...bookData, published: false },
  });

  for (const chapter of seedChapters) {
    await prisma.courseBookChapter.upsert({
      where: { bookId_number: { bookId: book.id, number: chapter.number } },
      update: {},
      create: {
        bookId: book.id,
        number: chapter.number,
        title: chapter.title,
        titleBn: chapter.titleBn,
        summary: chapter.summary,
        topics: chapter.topics,
        isSample: chapter.isSample ?? false,
        sortOrder: chapter.number * 10,
      },
    });
  }

  const linked = await prisma.courseBookOnCourse.count({ where: { bookId: book.id } });
  if (linked === 0 && courses.length > 0) {
    await prisma.courseBookOnCourse.createMany({
      data: courses.map((course) => ({ bookId: book.id, courseId: course.id })),
      skipDuplicates: true,
    });
  }
  console.log(
    `+ course book "${book.title}" with ${seedChapters.length} chapters ensured`,
  );

  for (const post of seedBookPosts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      // Drafts for faculty review: never published by the seed (A5).
      create: { ...post, published: false, publishedAt: null, needsReview: true },
    });
  }
  console.log(`+ ${seedBookPosts.length} course-book blog drafts ensured`);
}

async function main() {
  console.log("Seeding MUTI database…");

  /**
   * Content is seeded only on a fresh install — "seed runs only if the User
   * table is empty" (section 12). On a redeploy we still make sure the admin
   * user and the settings row exist, but we do not recreate courses, notices
   * or pages: staff may have deliberately deleted them.
   */
  const freshInstall = (await prisma.user.count()) === 0;

  await seedAdminUser();
  await seedSettings();
  await seedCourseBookRows();

  if (!freshInstall) {
    console.log("· existing installation — skipping content seed");
    console.log("Seed complete.");
    return;
  }

  await seedCoursesAndRoutines();
  await seedBatches();
  await seedContentItems();
  await seedPartnerRows();
  await seedLeadershipRows();
  await seedBannerRows();
  await seedFaqRows();
  await seedNoticeRows();
  await seedPageRows();
  await seedPostRows();
  // Testimonials, faculty and gallery stay empty on purpose (section 8) —
  // those public sections hide themselves when there is nothing to show.
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

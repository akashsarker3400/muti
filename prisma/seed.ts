import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { defaultSiteSettings } from "../src/lib/site-settings-schema";
import {
  eligibility,
  seedCourses,
  seedFaqs,
  seedNotices,
  seedPages,
  seedPartners,
  seedPosts,
} from "./seed-data";

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

  if (!freshInstall) {
    console.log("· existing installation — skipping content seed");
    console.log("Seed complete.");
    return;
  }

  await seedCoursesAndRoutines();
  await seedBatches();
  await seedPartnerRows();
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

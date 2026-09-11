-- CreateEnum
CREATE TYPE "PromoSlot" AS ENUM ('PROMO_A', 'PROMO_B');

-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('EMBED', 'UPLOAD');

-- CreateEnum
CREATE TYPE "VideoPlacement" AS ENUM ('HOME', 'ABOUT', 'HEALTH');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'PDF', 'VIDEO');

-- AlterEnum
ALTER TYPE "ApplicationType" ADD VALUE 'BOOK_SAMPLE';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "tag" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "slot" "PromoSlot" NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "mobileImage" TEXT,
    "link" TEXT,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "isOffer" BOOLEAN NOT NULL DEFAULT false,
    "showAsPopup" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "VideoSource" NOT NULL DEFAULT 'EMBED',
    "embedUrl" TEXT,
    "fileId" TEXT,
    "posterId" TEXT,
    "posterImage" TEXT,
    "autoplayMuted" BOOLEAN NOT NULL DEFAULT false,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "placement" "VideoPlacement" NOT NULL DEFAULT 'HOME',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBook" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "edition" TEXT,
    "coverImage" TEXT,
    "description" TEXT,
    "descriptionBn" TEXT,
    "pages" INTEGER,
    "priceNote" TEXT,
    "samplePdfFileId" TEXT,
    "sampleChapterTitle" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBookChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleBn" TEXT,
    "summary" TEXT,
    "topics" TEXT[],
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseBookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseBookOnCourse" (
    "bookId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "CourseBookOnCourse_pkey" PRIMARY KEY ("bookId","courseId")
);

-- CreateTable
CREATE TABLE "BookSampleDownload" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookSampleDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");

-- CreateIndex
CREATE INDEX "Promo_slot_active_sortOrder_idx" ON "Promo"("slot", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "SiteVideo_placement_published_sortOrder_idx" ON "SiteVideo"("placement", "published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBook_slug_key" ON "CourseBook"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBookChapter_bookId_number_key" ON "CourseBookChapter"("bookId", "number");

-- CreateIndex
CREATE INDEX "BookSampleDownload_applicationId_idx" ON "BookSampleDownload"("applicationId");

-- CreateIndex
CREATE INDEX "BookSampleDownload_createdAt_idx" ON "BookSampleDownload"("createdAt");

-- AddForeignKey
ALTER TABLE "SiteVideo" ADD CONSTRAINT "SiteVideo_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVideo" ADD CONSTRAINT "SiteVideo_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBook" ADD CONSTRAINT "CourseBook_samplePdfFileId_fkey" FOREIGN KEY ("samplePdfFileId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBookChapter" ADD CONSTRAINT "CourseBookChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "CourseBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBookOnCourse" ADD CONSTRAINT "CourseBookOnCourse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "CourseBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBookOnCourse" ADD CONSTRAINT "CourseBookOnCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookSampleDownload" ADD CONSTRAINT "BookSampleDownload_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;


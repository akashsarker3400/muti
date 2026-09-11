-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('COURSE', 'SEMESTER', 'BOARD');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'REVOKED');

-- CreateEnum
CREATE TYPE "BoardResultStatus" AS ENUM ('PASS', 'FAIL', 'WITHHELD', 'ABSENT');

-- CreateEnum
CREATE TYPE "TextPosition" AS ENUM ('LEFT', 'CENTER');

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "cta2LabelBn" TEXT,
ADD COLUMN     "cta2LabelEn" TEXT,
ADD COLUMN     "cta2Link" TEXT,
ADD COLUMN     "ctaLabelBn" TEXT,
ADD COLUMN     "ctaLabelEn" TEXT,
ADD COLUMN     "ctaLink" TEXT,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "mobileImage" TEXT,
ADD COLUMN     "overlay" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "subtitleBn" TEXT,
ADD COLUMN     "textPosition" "TextPosition" NOT NULL DEFAULT 'LEFT',
ADD COLUMN     "titleBn" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bmdc" TEXT,
ADD COLUMN     "bmdcNormalized" TEXT,
ADD COLUMN     "boardRegistrationNo" TEXT,
ADD COLUMN     "boardRoll" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "nameBn" TEXT,
ADD COLUMN     "nid" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchName" TEXT,
    "type" "CertificateType" NOT NULL DEFAULT 'COURSE',
    "issuedAt" TIMESTAMP(3),
    "session" TEXT,
    "grade" TEXT,
    "verifyToken" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'VALID',
    "revokedReason" TEXT,
    "file" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardExam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "heldIn" TEXT,
    "memoNo" TEXT,
    "publishedOn" TIMESTAMP(3),
    "courseId" TEXT,
    "boardName" TEXT NOT NULL DEFAULT 'Bangladesh Technical Education Board',
    "noticeFile" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardResult" (
    "id" TEXT NOT NULL,
    "boardExamId" TEXT NOT NULL,
    "roll" TEXT NOT NULL,
    "registrationNo" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "status" "BoardResultStatus" NOT NULL DEFAULT 'PASS',
    "gpa" DECIMAL(4,2),
    "failedSubjects" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipMessage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "roleTitleBn" TEXT NOT NULL,
    "roleTitleEn" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personNameBn" TEXT,
    "degrees" TEXT,
    "designationLine" TEXT,
    "photo" TEXT,
    "messageBn" TEXT NOT NULL,
    "messageEn" TEXT,
    "excerptBn" TEXT,
    "excerptEn" TEXT,
    "signatureImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadershipMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "degrees" TEXT,
    "designation" TEXT NOT NULL,
    "designationBn" TEXT,
    "organization" TEXT,
    "bio" TEXT,
    "photo" TEXT,
    "category" TEXT NOT NULL DEFAULT 'ADVISOR',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNo_key" ON "Certificate"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verifyToken_key" ON "Certificate"("verifyToken");

-- CreateIndex
CREATE INDEX "Certificate_studentId_idx" ON "Certificate"("studentId");

-- CreateIndex
CREATE INDEX "Certificate_courseId_status_idx" ON "Certificate"("courseId", "status");

-- CreateIndex
CREATE INDEX "VerificationLog_createdAt_idx" ON "VerificationLog"("createdAt");

-- CreateIndex
CREATE INDEX "BoardExam_published_publishedOn_idx" ON "BoardExam"("published", "publishedOn");

-- CreateIndex
CREATE INDEX "BoardResult_roll_idx" ON "BoardResult"("roll");

-- CreateIndex
CREATE INDEX "BoardResult_registrationNo_idx" ON "BoardResult"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "BoardResult_boardExamId_roll_key" ON "BoardResult"("boardExamId", "roll");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipMessage_key_key" ON "LeadershipMessage"("key");

-- CreateIndex
CREATE INDEX "LeadershipMessage_published_sortOrder_idx" ON "LeadershipMessage"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "Advisor_published_category_sortOrder_idx" ON "Advisor"("published", "category", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Student_boardRoll_key" ON "Student"("boardRoll");

-- CreateIndex
CREATE INDEX "Student_bmdc_idx" ON "Student"("bmdc");

-- CreateIndex
CREATE INDEX "Student_bmdcNormalized_idx" ON "Student"("bmdcNormalized");

-- CreateIndex
CREATE INDEX "Student_boardRegistrationNo_idx" ON "Student"("boardRegistrationNo");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardExam" ADD CONSTRAINT "BoardExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardResult" ADD CONSTRAINT "BoardResult_boardExamId_fkey" FOREIGN KEY ("boardExamId") REFERENCES "BoardExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardResult" ADD CONSTRAINT "BoardResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


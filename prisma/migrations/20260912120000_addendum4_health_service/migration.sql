-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'SEEN', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ContentKind" ADD VALUE 'HEALTH_SERVICE';

-- AlterEnum
ALTER TYPE "PartnerType" ADD VALUE 'COMMUNITY';

-- AlterTable
ALTER TABLE "GalleryAlbum" ADD COLUMN     "isHealthService" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HealthAppointment" (
    "id" TEXT NOT NULL,
    "serialDate" TEXT NOT NULL,
    "serialNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "area" TEXT,
    "complaint" TEXT,
    "preferredDate" TIMESTAMP(3),
    "referredBy" TEXT,
    "status" "HealthStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "HealthDailyCount" (
    "date" TEXT NOT NULL,
    "patients" INTEGER NOT NULL DEFAULT 0,
    "reports" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthDailyCount_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "HealthAppointment_status_createdAt_idx" ON "HealthAppointment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "HealthAppointment_createdAt_idx" ON "HealthAppointment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthAppointment_serialDate_serialNo_key" ON "HealthAppointment"("serialDate", "serialNo");


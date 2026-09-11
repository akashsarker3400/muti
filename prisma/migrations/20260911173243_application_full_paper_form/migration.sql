-- CreateEnum
CREATE TYPE "Employment" AS ENUM ('GOVT', 'PRIVATE', 'OTHER');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "education" JSONB,
ADD COLUMN     "employment" "Employment",
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "presentAddress" TEXT,
ADD COLUMN     "religion" TEXT;

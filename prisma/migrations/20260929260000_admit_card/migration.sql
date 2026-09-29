-- AlterTable
ALTER TABLE "BoardExam" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "centre" TEXT,
ADD COLUMN     "examDate" TIMESTAMP(3),
ADD COLUMN     "examTime" TEXT,
ADD COLUMN     "instructions" TEXT;

-- AddForeignKey
ALTER TABLE "BoardExam" ADD CONSTRAINT "BoardExam_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "detail" JSONB;

-- CreateIndex
CREATE INDEX "ActivityLog_entity_entityId_idx" ON "ActivityLog"("entity", "entityId");


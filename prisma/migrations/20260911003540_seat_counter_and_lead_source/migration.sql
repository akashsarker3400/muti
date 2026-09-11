-- Addendum 2, A1 + A3: live batch seat counter and structured lead attribution.
--
-- `Application.source` changes from free text (a referrer string) to the
-- LeadSource enum. Rather than dropping the column, the old text is preserved
-- in the new `utm` JSON as `referrer` and mapped onto the closest enum value,
-- so no existing enquiry loses its attribution.

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('FACEBOOK', 'GOOGLE', 'REFERRAL', 'WALK_IN', 'WEBSITE', 'OTHER');

-- AlterTable: new attribution columns
ALTER TABLE "Application"
  ADD COLUMN "referralCode" TEXT,
  ADD COLUMN "utm" JSONB;

-- Keep the old referrer text before the column type changes.
UPDATE "Application"
SET "utm" = jsonb_build_object('referrer', "source")
WHERE "source" IS NOT NULL AND "source" <> '';

-- Rename the old column out of the way, then add the typed one.
ALTER TABLE "Application" RENAME COLUMN "source" TO "source_legacy";
ALTER TABLE "Application" ADD COLUMN "source" "LeadSource";

-- Map what we can from the old free text.
UPDATE "Application"
SET "source" = CASE
  WHEN "source_legacy" IS NULL OR "source_legacy" = '' THEN NULL
  WHEN "source_legacy" ILIKE '%facebook%' OR "source_legacy" ILIKE '%fbclid%' THEN 'FACEBOOK'::"LeadSource"
  WHEN "source_legacy" ILIKE '%google%' OR "source_legacy" ILIKE '%gclid%' THEN 'GOOGLE'::"LeadSource"
  ELSE 'WEBSITE'::"LeadSource"
END;

ALTER TABLE "Application" DROP COLUMN "source_legacy";

-- AlterTable: live seat counter
ALTER TABLE "Batch"
  ADD COLUMN "seatsFilled" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "seatsFilledManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showSeatCounter" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Application_source_idx" ON "Application"("source");

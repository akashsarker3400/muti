-- English becomes the primary language. Where a record has no English text,
-- the Bangla value is copied into the English column as a temporary
-- placeholder so the NOT NULL constraint below can be applied without losing
-- anything; Admin → Needs English lists every such record (an English column
-- that still contains Bangla script) until the office replaces it.
UPDATE "ContentItem" SET "bodyEn" = "bodyBn" WHERE "bodyEn" IS NULL OR btrim("bodyEn") = '';
UPDATE "Faq" SET "questionEn" = "questionBn" WHERE "questionEn" IS NULL OR btrim("questionEn") = '';
UPDATE "Faq" SET "answerEn" = "answerBn" WHERE "answerEn" IS NULL OR btrim("answerEn") = '';
UPDATE "LeadershipMessage" SET "messageEn" = "messageBn" WHERE "messageEn" IS NULL OR btrim("messageEn") = '';
UPDATE "Notice" SET "titleEn" = "titleBn" WHERE "titleEn" IS NULL OR btrim("titleEn") = '';
UPDATE "Notice" SET "bodyEn" = "bodyBn" WHERE "bodyEn" IS NULL OR btrim("bodyEn") = '';
UPDATE "Page" SET "titleEn" = "titleBn" WHERE "titleEn" IS NULL OR btrim("titleEn") = '';
UPDATE "Page" SET "bodyEn" = "bodyBn" WHERE "bodyEn" IS NULL OR btrim("bodyEn") = '';
UPDATE "Post" SET "titleEn" = "titleBn" WHERE "titleEn" IS NULL OR btrim("titleEn") = '';
UPDATE "Post" SET "bodyEn" = "bodyBn" WHERE "bodyEn" IS NULL OR btrim("bodyEn") = '';

-- AlterTable
ALTER TABLE "ContentItem" ALTER COLUMN "bodyBn" DROP NOT NULL,
ALTER COLUMN "bodyEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "nameBn" DROP NOT NULL,
ALTER COLUMN "fullNameBn" DROP NOT NULL,
ALTER COLUMN "durationLabelBn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Faq" ALTER COLUMN "questionBn" DROP NOT NULL,
ALTER COLUMN "questionEn" SET NOT NULL,
ALTER COLUMN "answerBn" DROP NOT NULL,
ALTER COLUMN "answerEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "LeadershipMessage" ALTER COLUMN "roleTitleBn" DROP NOT NULL,
ALTER COLUMN "messageBn" DROP NOT NULL,
ALTER COLUMN "messageEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Notice" ALTER COLUMN "titleBn" DROP NOT NULL,
ALTER COLUMN "titleEn" SET NOT NULL,
ALTER COLUMN "bodyBn" DROP NOT NULL,
ALTER COLUMN "bodyEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Page" ALTER COLUMN "titleBn" DROP NOT NULL,
ALTER COLUMN "titleEn" SET NOT NULL,
ALTER COLUMN "bodyBn" DROP NOT NULL,
ALTER COLUMN "bodyEn" SET NOT NULL;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "titleBn" DROP NOT NULL,
ALTER COLUMN "titleEn" SET NOT NULL,
ALTER COLUMN "bodyBn" DROP NOT NULL,
ALTER COLUMN "bodyEn" SET NOT NULL;


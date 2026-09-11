-- AlterTable
ALTER TABLE "HealthAppointment" ADD COLUMN     "pregnancyMonths" INTEGER,
ADD COLUMN     "pregnant" TEXT;

-- AlterTable
ALTER TABLE "HealthDailyCount" ADD COLUMN     "consultations" INTEGER NOT NULL DEFAULT 0;


-- Addendum 4.1: the two service pillars replace the four addendum-4 cards,
-- but only while the four are still exactly the seeded ones (the office has
-- not edited them). The transparency note gains its referral line the same
-- way: only if the row still carries the addendum-4 default text.
DELETE FROM "ContentItem"
WHERE "kind" = 'HEALTH_SERVICE'
  AND (SELECT count(*) FROM "ContentItem" WHERE "kind" = 'HEALTH_SERVICE') = 4
  AND NOT EXISTS (
    SELECT 1 FROM "ContentItem" WHERE "kind" = 'HEALTH_SERVICE'
      AND "bodyBn" NOT IN ('বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা', 'একই দিনে লিখিত রিপোর্ট', 'বিনামূল্যে ডাক্তার পরামর্শ', 'প্রয়োজনে হাসপাতালে রেফারের পরামর্শ')
  );

INSERT INTO "ContentItem" ("id", "kind", "icon", "titleBn", "titleEn", "bodyBn", "bodyEn", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.kind, v.icon, NULL, NULL, v."bodyBn", v."bodyEn", v."sortOrder", NOW(), NOW()
FROM (VALUES
  ('HEALTH_SERVICE'::"ContentKind", 'ScanLine', 'বিনা মূল্যে আল্ট্রাসোনোগ্রাম পরীক্ষা', 'Free ultrasonogram examination', 10),
  ('HEALTH_SERVICE'::"ContentKind", 'Stethoscope', 'বিনা মূল্যে চিকিৎসকের পরামর্শ', 'Free doctor consultation', 20)
) AS v(kind, icon, "bodyBn", "bodyEn", "sortOrder")
WHERE NOT EXISTS (SELECT 1 FROM "ContentItem" WHERE "kind" = 'HEALTH_SERVICE');

UPDATE "SiteSetting"
SET json = jsonb_set(
  jsonb_set(json::jsonb, '{health,transparencyBn}',
    to_jsonb((json::jsonb->'health'->>'transparencyBn') || '<p>জরুরি বা ঝুঁকিপূর্ণ কিছু পাওয়া গেলে দ্রুত নিকটস্থ হাসপাতাল বা বিশেষজ্ঞের কাছে রেফার করা হয়।</p>')),
  '{health,transparencyEn}',
    to_jsonb((json::jsonb->'health'->>'transparencyEn') || '<p>If anything urgent or high-risk is found, the patient is referred promptly to the nearest hospital or specialist.</p>'))
WHERE id = 1
  AND json::jsonb->'health'->>'transparencyBn' LIKE '%স্ক্রিনিং রিপোর্ট%'
  AND json::jsonb->'health'->>'transparencyBn' NOT LIKE '%ঝুঁকিপূর্ণ%';

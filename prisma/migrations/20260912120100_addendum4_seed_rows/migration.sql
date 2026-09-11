-- Addendum 4 on an existing installation: the four "what we provide" cards
-- and the privacy-page paragraph about health serials. Guarded, never
-- overwriting anything the office has edited.
INSERT INTO "ContentItem" ("id", "kind", "icon", "titleBn", "titleEn", "bodyBn", "bodyEn", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.kind, v.icon, NULL, NULL, v."bodyBn", v."bodyEn", v."sortOrder", NOW(), NOW()
FROM (VALUES
  ('HEALTH_SERVICE'::"ContentKind", 'ScanLine', 'বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা', 'Free ultrasound examination', 10),
  ('HEALTH_SERVICE'::"ContentKind", 'FileText', 'একই দিনে লিখিত রিপোর্ট', 'Written report the same day', 20),
  ('HEALTH_SERVICE'::"ContentKind", 'Stethoscope', 'বিনামূল্যে ডাক্তার পরামর্শ', 'Free doctor consultation', 30),
  ('HEALTH_SERVICE'::"ContentKind", 'Hospital', 'প্রয়োজনে হাসপাতালে রেফারের পরামর্শ', 'Referral advice to a hospital when needed', 40)
) AS v(kind, icon, "bodyBn", "bodyEn", "sortOrder")
WHERE NOT EXISTS (SELECT 1 FROM "ContentItem" WHERE "kind" = 'HEALTH_SERVICE');

UPDATE "Page"
SET "bodyBn" = replace("bodyBn", '<h2>যোগাযোগ</h2>', '<h2>বিনামূল্যে স্বাস্থ্যসেবার সিরিয়াল</h2><p>স্বাস্থ্যসেবার সিরিয়াল ফরমে দেওয়া নাম, মোবাইল নম্বর, বয়স, এলাকা ও সমস্যার সংক্ষিপ্ত বিবরণ শুধু সিরিয়াল দেওয়া ও আপনার সাথে যোগাযোগের জন্য ব্যবহার হয়। এগুলো স্বাস্থ্য সংক্রান্ত তথ্য: কোনো রোগীর নাম কখনো ওয়েবসাইটে প্রকাশ করা হয় না, লিখিত সম্মতি ছাড়া রোগীর ছবি ব্যবহার করা হয় না, এবং ৯০ দিন পর রেকর্ড থেকে নাম ও নম্বর স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।</p><h2>যোগাযোগ</h2>'),
    "bodyEn" = replace("bodyEn", '<h2>Contact</h2>', '<h2>Free health service serials</h2><p>The name, mobile number, age, area and one-line complaint given on the health service serial form are used only to issue the serial and contact you. This is health data: no patient name is ever published on the website, no patient photo is used without written consent, and the name and number are automatically removed from the record after 90 days.</p><h2>Contact</h2>')
WHERE "slug" = 'privacy'
  AND "bodyBn" NOT LIKE '%স্বাস্থ্যসেবার সিরিয়াল%'
  AND "bodyBn" LIKE '%<h2>যোগাযোগ</h2>%';

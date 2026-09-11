-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('WHY_CHOOSE', 'DOCUMENT', 'PAYMENT_POLICY', 'ADMISSION_STEP', 'VALUE', 'CERTIFICATE');

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "icon" TEXT,
    "titleBn" TEXT,
    "titleEn" TEXT,
    "bodyBn" TEXT NOT NULL,
    "bodyEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentItem_kind_published_sortOrder_idx" ON "ContentItem"("kind", "published", "sortOrder");

-- Backfill the lists that used to live in src/lib/content.ts, so an existing
-- installation keeps showing exactly the same copy after this migration.
-- Guarded by NOT EXISTS: if the office has already curated its own content,
-- or a later redeploy replays this file, nothing is duplicated.
INSERT INTO "ContentItem" ("id", "kind", "icon", "titleBn", "titleEn", "bodyBn", "bodyEn", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.kind, v.icon, v."titleBn", v."titleEn", v."bodyBn", v."bodyEn", v."sortOrder", NOW(), NOW()
FROM (VALUES
  ('WHY_CHOOSE'::"ContentKind", 'ShieldCheck', NULL, NULL, 'সরকার অনুমোদিত প্রতিষ্ঠান, কোড ৫৭১২৫', 'Government approved and industry recognized', 10),
  ('WHY_CHOOSE'::"ContentKind", 'Stethoscope', NULL, NULL, 'প্রত্যেকটি ক্লাসে রিয়েল পেশেন্টের মাধ্যমে হাতে-কলমে প্র্যাকটিক্যাল', '100% hands-on training on real patients in every class', 20),
  ('WHY_CHOOSE'::"ContentKind", 'GraduationCap', NULL, NULL, 'অভিজ্ঞ সোনোলজিস্ট ও আল্ট্রাসনোগ্রাম বিশেষজ্ঞ দ্বারা পরিচালিত', 'Experienced sonologists and ultrasonogram specialists as faculty', 30),
  ('WHY_CHOOSE'::"ContentKind", 'MonitorSmartphone', NULL, NULL, 'আধুনিক আল্ট্রাসাউন্ড মেশিন', 'Modern ultrasound equipment', 40),
  ('WHY_CHOOSE'::"ContentKind", 'Gift', NULL, NULL, 'ভর্তির আগে ফ্রি ক্লাসের সুযোগ', 'Free class before admission', 50),
  ('WHY_CHOOSE'::"ContentKind", 'Infinity', NULL, NULL, 'আজীবন প্র্যাকটিক্যাল ও ওয়ার্কশপ', 'Lifetime practical and workshop access', 60),
  ('WHY_CHOOSE'::"ContentKind", 'Users', NULL, NULL, 'ব্যক্তিগত মেন্টরশিপ ও ক্যারিয়ার সাপোর্ট', 'Personalized mentorship and 100% career support', 70),
  ('WHY_CHOOSE'::"ContentKind", 'Award', NULL, NULL, 'কোর্স শেষে সরকারি সার্টিফিকেট', 'Government certificate after course completion', 80),
  ('WHY_CHOOSE'::"ContentKind", 'UsersRound', NULL, NULL, 'গ্রুপ ভর্তিতে বিশেষ ছাড়', 'Special discount for group admission', 90),
  ('WHY_CHOOSE'::"ContentKind", 'CreditCard', NULL, NULL, 'সহজ কিস্তিতে পেমেন্ট', 'Easy installment (EMI) payment', 100),
  ('DOCUMENT'::"ContentKind", NULL, NULL, NULL, '২ কপি পাসপোর্ট সাইজ ছবি', '2 copies passport size photo', 10),
  ('DOCUMENT'::"ContentKind", NULL, NULL, NULL, '২ কপি স্ট্যাম্প সাইজ ছবি', '2 copies stamp size photo', 20),
  ('DOCUMENT'::"ContentKind", NULL, NULL, NULL, 'জাতীয় পরিচয়পত্রের কপি', 'National ID card copy', 30),
  ('DOCUMENT'::"ContentKind", NULL, NULL, NULL, 'Bangladesh Medical and Dental Council (BMDC) রেজিস্ট্রেশন', 'BMDC (Bangladesh Medical and Dental Council) registration', 40),
  ('DOCUMENT'::"ContentKind", NULL, NULL, NULL, 'MBBS সনদপত্র', 'MBBS certificate', 50),
  ('DOCUMENT'::"ContentKind", NULL, NULL, NULL, 'SSC পাশের সনদ', 'SSC certificate', 60),
  ('PAYMENT_POLICY'::"ContentKind", NULL, NULL, NULL, 'ভর্তির সময় কোর্স ফি''র ৫০% জমা দিয়ে ভর্তি নিশ্চিত করতে হবে।', '50% of the course fee must be paid at admission to confirm the seat.', 10),
  ('PAYMENT_POLICY'::"ContentKind", NULL, NULL, NULL, 'অবশিষ্ট টাকা সহজ মাসিক কিস্তিতে পরিশোধযোগ্য।', 'The remaining amount is payable in easy monthly installments.', 20),
  ('PAYMENT_POLICY'::"ContentKind", NULL, NULL, NULL, 'প্রতি মাসের ১ থেকে ৭ তারিখের মধ্যে কিস্তির টাকা পরিশোধ করতে হবে।', 'Installments must be paid between the 1st and the 7th of each month.', 30),
  ('ADMISSION_STEP'::"ContentKind", NULL, 'WhatsApp করুন বা অফিসে আসুন', 'WhatsApp us or visit the office', 'কোর্স, ফি ও ব্যাচ সম্পর্কে জেনে নিন।', 'Ask about courses, fees and the upcoming batch.', 10),
  ('ADMISSION_STEP'::"ContentKind", NULL, 'ফ্রি ক্লাস করুন', 'Attend a free class', 'ভর্তির আগে একটি ক্লাস ফ্রি করে দেখে নিন।', 'See a real class before you decide to enrol.', 20),
  ('ADMISSION_STEP'::"ContentKind", NULL, 'কাগজপত্র ও ৫০% ফি জমা দিন', 'Submit documents and 50% of the fee', 'স্ক্যান কপি ও হার্ড কপি অফিসে জমা দিয়ে আসন নিশ্চিত করুন।', 'Hand in scan copies plus hard copies at the office to confirm your seat.', 30),
  ('ADMISSION_STEP'::"ContentKind", NULL, 'ক্লাস শুরু করুন', 'Start your classes', 'ব্যাচের সাথে ক্লাস ও রিয়েল পেশেন্ট প্র্যাকটিস শুরু।', 'Join the batch and begin real-patient practice.', 40),
  ('VALUE'::"ContentKind", NULL, 'লক্ষ্য', 'Mission', 'হাতে-কলমে, রিয়েল পেশেন্ট ভিত্তিক শিক্ষার মাধ্যমে দক্ষ ও আত্মবিশ্বাসী সোনোলজিস্ট তৈরি করা।', 'Train competent, confident sonologists through hands-on, real-patient education.', 10),
  ('VALUE'::"ContentKind", NULL, 'দৃষ্টিভঙ্গি', 'Vision', 'উত্তর ও মধ্য বাংলাদেশের সবচেয়ে নির্ভরযোগ্য আল্ট্রাসাউন্ড প্রশিক্ষণ প্রতিষ্ঠান হয়ে ওঠা।', 'Be the most trusted ultrasound training institute in northern and central Bangladesh.', 20),
  ('VALUE'::"ContentKind", NULL, 'মূল্যবোধ', 'Values', 'রোগীর নিরাপত্তা, একাডেমিক মান, মেন্টরশিপ এবং আজীবন শেখা।', 'Patient safety, academic rigour, mentorship, lifelong learning.', 30),
  ('CERTIFICATE'::"ContentKind", NULL, NULL, NULL, 'Certificate in Medical Ultrasound (CMU)', 'Certificate in Medical Ultrasound (CMU)', 10),
  ('CERTIFICATE'::"ContentKind", NULL, NULL, NULL, 'Certificate in Medical Ultrasound — BTEB অনুমোদিত', 'Certificate in Medical Ultrasound — BTEB approved', 20),
  ('CERTIFICATE'::"ContentKind", NULL, NULL, NULL, 'Diploma in Medical Ultrasound (DMU)', 'Diploma in Medical Ultrasound (DMU)', 30),
  ('CERTIFICATE'::"ContentKind", NULL, NULL, NULL, 'Advanced Diploma in Medical Ultrasound (ADMU)', 'Advanced Diploma in Medical Ultrasound (ADMU)', 40),
  ('CERTIFICATE'::"ContentKind", NULL, NULL, NULL, 'Certificate in Transvaginal Ultrasound (TVS)', 'Certificate in Transvaginal Ultrasound (TVS)', 50)
) AS v(kind, icon, "titleBn", "titleEn", "bodyBn", "bodyEn", "sortOrder")
WHERE NOT EXISTS (SELECT 1 FROM "ContentItem");

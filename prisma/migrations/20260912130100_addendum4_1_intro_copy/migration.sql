-- Addendum 4.1: an installation that saved the health tab while the
-- addendum-4 intro was the default still carries that text. Swap it for the
-- official copy only when it is byte-for-byte the old default, so an intro
-- the office wrote themselves is left alone.
UPDATE "SiteSetting"
SET json = jsonb_set(jsonb_set(json::jsonb,
  '{health,introBn}', '"মাতৃ ও শিশুর সুস্থতা এবং নিরাপদ মাতৃত্ব নিশ্চিত করার লক্ষ্যে MUTI Ultrasound-এর একটি মানবিক উদ্যোগ:"'),
  '{health,introEn}', '"A humanitarian initiative by MUTI Ultrasound to ensure the health of mothers and children and safe motherhood:"')
WHERE id = 1
  AND json::jsonb->'health'->>'introBn' = 'প্রশিক্ষণের পাশাপাশি MUTI প্রতিদিন গরীব ও অসহায় মানুষের জন্য বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা, লিখিত রিপোর্ট ও ডাক্তার পরামর্শ দেয়। অভিজ্ঞ সোনোলজিস্টের তত্ত্বাবধানে প্রশিক্ষণরত MBBS ডাক্তাররা পরীক্ষা করেন।';

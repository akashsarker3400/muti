-- Addendum 3 §4/§6 on an existing installation: the two unpublished
-- leadership placeholders and the three hero banners. Guarded so a rerun
-- never duplicates, and never touches rows the office has since edited.
INSERT INTO "LeadershipMessage" ("id","key","roleTitleBn","roleTitleEn","personName","personNameBn","messageBn","messageEn","excerptBn","excerptEn","sortOrder","published","createdAt","updatedAt")
SELECT 'lead_chairman','chairman','প্রতিষ্ঠান চেয়ারম্যান','Chairman','TODO: Chairman''s name','TODO: চেয়ারম্যানের নাম',
       '<p>TODO: প্রতিষ্ঠান চেয়ারম্যান এর বক্তব্য এখানে লিখুন।</p>','<p>TODO: Message from the Chairman.</p>',
       'TODO: হোমপেজ কার্ডের জন্য দুই লাইনের উদ্ধৃতি।','TODO: Two-line excerpt for the homepage card.',1,false,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM "LeadershipMessage" WHERE "key"='chairman');

INSERT INTO "LeadershipMessage" ("id","key","roleTitleBn","roleTitleEn","personName","personNameBn","messageBn","messageEn","excerptBn","excerptEn","sortOrder","published","createdAt","updatedAt")
SELECT 'lead_md','managing-director','ব্যবস্থাপনা পরিচালক','Managing Director','TODO: Managing Director''s name','TODO: ব্যবস্থাপনা পরিচালকের নাম',
       '<p>TODO: ব্যবস্থাপনা পরিচালক এর বক্তব্য এখানে লিখুন।</p>','<p>TODO: Message from the Managing Director.</p>',
       'TODO: হোমপেজ কার্ডের জন্য দুই লাইনের উদ্ধৃতি।','TODO: Two-line excerpt for the homepage card.',2,false,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM "LeadershipMessage" WHERE "key"='managing-director');

INSERT INTO "Banner" ("id","titleBn","subtitleBn","title","subtitle","image","overlay","textPosition","sortOrder","active","createdAt","updatedAt")
SELECT 'banner_seed_1','ময়মনসিংহে সর্বপ্রথম সরকার অনুমোদিত আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট','CMU, DMU, ADMU কোর্সে ভর্তি চলছে',
       'The first government-approved ultrasound training institute in Mymensingh','Admission open for CMU, DMU and ADMU','',40,'LEFT',1,true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM "Banner");

INSERT INTO "Banner" ("id","titleBn","subtitleBn","title","subtitle","image","overlay","textPosition","sortOrder","active","createdAt","updatedAt")
SELECT 'banner_seed_2','প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিক্যাল','অভিজ্ঞ সোনোলজিস্ট দ্বারা পরিচালিত',
       'Hands-on practice on real patients in every class','Taught by experienced sonologists','',40,'LEFT',2,true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM "Banner" WHERE "id" <> 'banner_seed_1');

INSERT INTO "Banner" ("id","titleBn","subtitleBn","title","subtitle","image","overlay","textPosition","sortOrder","active","createdAt","updatedAt")
SELECT 'banner_seed_3','ভর্তির আগে ফ্রি ক্লাসের সুযোগ','আজই WhatsApp করুন 01778-838644',
       'Attend a free class before you enrol','WhatsApp us today: 01778-838644','',40,'LEFT',3,true,now(),now()
WHERE NOT EXISTS (SELECT 1 FROM "Banner" WHERE "id" NOT IN ('banner_seed_1','banner_seed_2'));

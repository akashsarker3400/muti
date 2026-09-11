# MUTI Website: Complete Build Specification

**Project:** Official website + admin panel for Mymensingh Ultrasound Training Institute (MUTI)
**Audience for this document:** An AI coding agent (or developer) who will build the entire project from this file alone. Read it fully before writing code. Every section is required unless marked "Phase 2" or "Optional".
**Reference sites for look and feel:** https://www.cmudusg.com (primary, calm medical style) and https://www.pia-bd.com (notice board, apply now, map footer). Do not copy their code or content.

---

## 1. Goal and non-negotiables

The site exists to convert visitors (MBBS doctors, intern doctors, medical professionals in greater Mymensingh) into one of two actions:
1. A WhatsApp message to +8801778838644
2. An online admission application

Non-negotiables:
- **Light theme only. No dark mode. No theme toggle.** It is an institute website.
- **Mobile-first.** Most traffic comes from Facebook on Android phones.
- **Bilingual UI: Bangla (default) and English**, switchable from the header. Course names, fees and technical terms stay in English in both languages.
- **Admin panel** at `/admin` so office staff (non-technical) can manage every piece of content without touching code.
- **Self-hosted** on the owner's Coolify server (Docker). No paid SaaS dependencies except optional email sending.
- **Never publish** owner personal documents (TIN, NID, trade license image). Only institute name, Govt institute code 57125, and affiliation logos.
- Where content is marked `TODO` in this document, do not invent it. Build the field, seed a clear placeholder, and list it in the final handover as "needs real content".

---

## 2. Tech stack (fixed)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript | Server components for public pages, route handlers for API |
| Styling | Tailwind CSS v4 + shadcn/ui components | Light palette only, see section 4 |
| Database | PostgreSQL 16 | Runs as a Coolify service |
| ORM | Prisma | Schema in section 6 |
| Auth (admin) | Auth.js (NextAuth v5), Credentials provider, bcrypt passwords, JWT sessions | Roles: SUPER_ADMIN, STAFF |
| File uploads | Local disk volume `/app/uploads` served via Next route `/uploads/[...path]` | Images processed with `sharp` (resize to max 1600px, webp) |
| Email | Nodemailer via SMTP (Gmail app password of mymensinghultrasound@gmail.com) | For application notifications |
| i18n | `next-intl`, locales `bn` (default) and `en`, URL prefix `/en/...`, Bangla has no prefix | |
| Fonts | Bangla: Hind Siliguri (Google Fonts). English: Inter | via `next/font` |
| Forms/validation | react-hook-form + zod | |
| Rich text (admin) | Tiptap editor, stores HTML | For notices, course descriptions, blog |
| Deployment | Dockerfile (multi-stage, standalone output) + Coolify | Section 12 |
| Analytics | GA4 + Meta Pixel, IDs from admin Site Settings | Only load if ID present |

Do not add a headless CMS. Build the admin panel inside the same Next.js app.

---

## 3. Institute facts (source of truth for content)

**Names**
- English: Mymensingh Ultrasound Training Institute
- Short: MUTI
- Bangla: ময়মনসিংহ আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট (মুটি)
- Established: 2009
- Government institute code / Reg. No.: 57125 (Bangla: ৫৭১২৫)
- Tagline (EN): Training is an Investment for the Future
- Tagline (BN): বৃহত্তর ময়মনসিংহে সর্বপ্রথম এবং সরকার কর্তৃক অনুমোদিত আলট্রাসাউন্ড প্রশিক্ষণ কেন্দ্র
- Positioning line: "সাফল্যের ১৬তম বর্ষে পদার্পণ" (16th year, update yearly from Site Settings)

**Contact**
- Address (BN): ১১০/৩ বাঘমারা রোড, বাঘ্মপল্লী, রেডিয়েন্ট হাসপাতাল এর পাশের বিল্ডিং, নিলুফা হাউজ এর ২য় তলা, ময়মনসিংহ
- Address (EN): 110/3 Baghmara Road, 2nd Floor, Nilufa House (building beside Radiant Hospital), Mymensingh
- Phone 1 / WhatsApp / office: +8801778838644 (display: 01778-838644)
- Phone 2: +8801995357860 (display: 01995-357860)
- Email: mymensinghultrasound@gmail.com
- Facebook: https://www.facebook.com/profile.php?id=61582686171614
- Google Map: `TODO` exact coordinates. Use Google Maps embed with the address string as query until coordinates are provided.
- Office hours: `TODO`

**Affiliation / recognition**
- Affiliation with: Bangladesh Technical Education Board (BTEB), Ministry of Education, Govt. of the People's Republic of Bangladesh
- Collaboration with: World Association of Ultrasound in Combined Medicine (WAUCM); Jonosastho Pacific Limited
- Govt approved institute, code 57125
- Note for the builder: display "Government approved institute, Code 57125" as the headline claim. Show BTEB/WAUCM/Jonosastho as logo cards under "Affiliation & Collaboration". Do not write "International Accreditation" anywhere.

**Why choose MUTI** (bullet content, both languages)
1. Government approved and industry recognized / সরকার অনুমোদিত প্রতিষ্ঠান, কোড ৫৭১২৫
2. 100% hands-on training on real patients in every class / প্রত্যেকটি ক্লাসে রিয়েল পেশেন্টের মাধ্যমে হাতে-কলমে প্র্যাকটিক্যাল
3. Experienced sonologists and ultrasonogram specialists as faculty / অভিজ্ঞ সোনোলজিস্ট ও আল্ট্রাসনোগ্রাম বিশেষজ্ঞ দ্বারা পরিচালিত
4. Modern ultrasound equipment / আধুনিক আল্ট্রাসাউন্ড মেশিন
5. Free class before admission / ভর্তির আগে ফ্রি ক্লাসের সুযোগ
6. Lifetime practical and workshop access / আজীবন প্র্যাকটিক্যাল ও ওয়ার্কশপ
7. Personalized mentorship and 100% career support / ব্যক্তিগত মেন্টরশিপ ও ক্যারিয়ার সাপোর্ট
8. Government certificate after course completion / কোর্স শেষে সরকারি সার্টিফিকেট
9. Special discount for group admission / গ্রুপ ভর্তিতে বিশেষ ছাড়
10. Easy installment (EMI) payment / সহজ কিস্তিতে পেমেন্ট

**Admission requirement**
- Minimum qualification: MBBS or equivalent. Intern doctors can also apply.
- BN: ন্যূনতম যোগ্যতা MBBS বা সমমান। ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন।

**Required documents (all courses)**
- 2 copies passport size photo / ২ কপি পাসপোর্ট সাইজ ছবি
- 2 copies stamp size photo / ২ কপি স্ট্যাম্প সাইজ ছবি
- National ID card copy / জাতীয় পরিচয়পত্রের কপি
- BMDC registration / Bangladesh Medical and Dental Council রেজিস্ট্রেশন
- MBBS certificate / MBBS সনদপত্র
- SSC certificate / SSC পাশের সনদ
- Note: scan copy + hard copy of all documents must be submitted at the office at admission time.

**Payment policy (all courses)**
- 50% of course fee must be paid at admission to confirm the seat.
- Remaining amount payable in easy monthly installments.
- Installments must be paid between the 1st and 7th of each month.
- BN: ভর্তির সময় কোর্স ফি'র ৫০% জমা দিয়ে ভর্তি নিশ্চিত করতে হবে। অবশিষ্ট টাকা সহজ কিস্তিতে পরিশোধযোগ্য। প্রতি মাসের ১ থেকে ৭ তারিখের মধ্যে কিস্তির টাকা পরিশোধ করতে হবে।

---

## 4. Design system (light only)

**Palette** (derived from the logo: navy ring, red ring, yellow star)
- `--primary` navy `#1B2A6B` (headings, nav, primary buttons)
- `--primary-dark` `#12204F`
- `--accent` red `#D62828` (secondary CTA, badges like "ভর্তি চলছে")
- `--highlight` yellow `#F4C20D` (small accents, star, ribbon only; never large fills)
- `--whatsapp` `#25D366`
- `--bg` `#FFFFFF`, `--bg-soft` `#F5F7FB` (alternate section backgrounds)
- `--text` `#1A1A1A`, `--text-muted` `#5B6472`, `--border` `#E3E7EE`
- Success `#1E8E3E`, warning `#B26A00`, error `#C62828`

**Typography**
- Bangla body/headings: Hind Siliguri 400/500/600/700
- English: Inter 400/500/600/700
- Scale: h1 36/44 mobile 28/36, h2 28/36, h3 22/30, body 16/26, small 14/22
- Line height for Bangla is set higher (1.7) to avoid glyph clipping.

**Components (shadcn/ui, restyled)**
- Buttons: primary (navy fill, white text, radius 10px), accent (red fill), whatsapp (green fill with WhatsApp icon), outline.
- Cards: white, 1px border, radius 14px, shadow-sm, hover lifts 2px.
- Section spacing: 64px desktop, 40px mobile. Max content width 1200px.
- Badges: "ভর্তি চলছে / Admission Open" red pill; "Govt. Approved" navy pill with check icon.
- Sticky header with logo, nav, language switch, "WhatsApp" and "Apply Now" buttons. On mobile: hamburger + always-visible WhatsApp icon button.
- Floating WhatsApp button bottom-right on all public pages. Link: `https://wa.me/8801778838644?text=` + URL-encoded prefilled text per page (e.g. course pages: "আমি {course name} কোর্স সম্পর্কে জানতে চাই").
- Top announcement bar (admin-controlled, dismissible) above the header.
- Do not use gradients, rainbow colors, or the poster style. Posters are for Facebook; the site must look like a serious medical institute.

**Accessibility:** color contrast AA, focus rings, alt text on all images, tap targets 44px.

---

## 5. Public site: pages and sections

Routes are for `bn` (no prefix). `en` mirrors under `/en`.

### 5.1 Home `/`
1. Announcement bar (from Site Settings, if active)
2. Hero: left text, right image (admin-set hero image, default: real practical session photo). Headline BN: "ময়মনসিংহে সর্বপ্রথম সরকার অনুমোদিত আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট". Sub: "CMU, DMU, ADMU ও স্পেশাল কোর্সে ভর্তি চলছে। প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিস।" Buttons: "Apply Now" (accent) and "WhatsApp করুন" (whatsapp). Small trust row under buttons: "Govt. Code 57125 • Since 2009 • BTEB affiliation".
3. Stats strip (4 counters, admin-editable): Years (auto from 2009), Courses (count), Doctors trained (`TODO` real number, hide the tile if empty), Practical classes per batch.
4. Courses grid: all published courses as cards (name, short tag, duration, fee, "Details" link). Sort by `sortOrder`.
5. Why choose MUTI: 6 to 8 icon cards from section 3.
6. Real patient practical block: image + text "প্রত্যেকটি ক্লাসে রিয়েল পেশেন্টের মাধ্যমে হাতে-কলমে প্র্যাকটিক্যাল প্র্যাকটিস করানো হয়।"
7. Next batch + free class CTA: shows the next upcoming Batch (from admin) with start date and "Book a free class" button (opens Free Class form).
8. Affiliation & Collaboration logos row.
9. Latest notices (5, with date, link to /notices).
10. Testimonials carousel (published testimonials).
11. Faculty preview (4 cards) linking to /faculty.
12. Gallery preview (8 thumbs).
13. Contact strip: address, phones, email, map embed, Facebook.
14. Footer: logo, one-line about, quick links, programs list, contact, map, "Govt. institute code 57125", copyright with current year.

### 5.2 About `/about`
- Hero title: "ডাক্তারদের জন্য, ডাক্তারদের দ্বারা পরিচালিত" / "Built for doctors, run by doctors"
- Story (admin rich text). Seed: founded 2009, first ultrasound training institute in greater Mymensingh, Government approved code 57125, aim: every MBBS doctor in the region can scan independently.
- Mission / Vision / Values (3 cards, admin-editable). Seed:
  - Mission: Train competent, confident sonologists through hands-on, real-patient education.
  - Vision: Be the most trusted ultrasound training institute in northern and central Bangladesh.
  - Values: Patient safety, academic rigour, mentorship, lifelong learning.
- Director message block: photo, name, degrees, designation, message. `TODO` all fields; seed with placeholder "Director's message coming soon" and hide the block if empty.
- Affiliation & Collaboration section.
- Timeline (optional, admin list): 2009 Established, 2010 BTEB provisional approval, ... `TODO`.

### 5.3 Courses `/courses`
Grid of all published courses. Filter chips: All / Certificate / Diploma / Special. Each card: name, code, level badge, duration, course fee, "Admission open" badge if `admissionOpen`, "Details" button, WhatsApp button.

### 5.4 Course detail `/courses/[slug]`
Sections in this order:
1. Header: name, code, level, duration, admission status badge, buttons Apply Now + WhatsApp.
2. Overview (rich text).
3. Fee card: Course fee, Exam & form fill-up fee, Admission form fee, Books, Total; optional Offer price with label (only show strikethrough when `offerPrice` is set and `offerLabel` present). Payment policy text.
4. Class structure: lecture classes, practical classes, total.
5. Syllabus / routine table (from `CourseRoutine` rows grouped by semester).
6. Eligibility and required documents.
7. Certificate: text from `certificateNote`.
8. FAQ specific to course (optional) + global FAQ.
9. Related courses.
10. Sticky bottom bar on mobile: fee + Apply + WhatsApp.

### 5.5 Admission `/admission`
Eligibility, documents, payment policy, step list (1 WhatsApp or visit, 2 free class, 3 submit documents and 50% fee, 4 start class), then the online admission form (same as /apply). Download buttons for PDFs uploaded in admin (Downloads).

### 5.6 Apply `/apply`
Form fields: full name*, phone* (BD format validation), WhatsApp number (same as phone checkbox), email, course* (select from published courses), qualification* (select: MBBS, Intern doctor, Other), BMDC registration (optional), current workplace/location, preferred batch (select from upcoming batches, optional), message, consent checkbox. Honeypot field + rate limit (5/hour/IP). On submit: save `Application`, send email to admin email, show success page with "Message us on WhatsApp" button prefilled with "আমি {name}, {course} কোর্সে আবেদন করেছি।"

### 5.7 Free class booking `/free-class`
Fields: name*, phone*, course of interest*, preferred date (optional), message. Saves as `Application` with `type = FREE_CLASS`.

### 5.8 Faculty `/faculty`
Cards: photo, name, degrees, designation, short bio. Order by `sortOrder`. `TODO` real content, seed 1 placeholder hidden.

### 5.9 Accreditation `/accreditation`
Govt code, BTEB card, Ministry of Education, WAUCM, Jonosastho Pacific, list of certificates offered. Admin-editable logos and text. Show document images only if admin uploads them (e.g. BTEB letter) with a caption.

### 5.10 Notices `/notices` and `/notices/[slug]`
List with date, category badge (Admission, Exam, Result, Holiday, General), pinned first, paginated 10. Detail page renders rich text and attachments.

### 5.11 Results `/results`
List of published Result entries (batch name, course, exam name, date, PDF attachment or per-student table). Search by roll.

### 5.12 Certificate verification `/verify`
Input: certificate number or roll. Output: student name (masked middle characters), course, batch, completion date, status "Valid". If not found: "No record found, contact office". Rate limited.

### 5.13 Gallery `/gallery`
Albums (admin) with lightbox. Filter by album.

### 5.14 Blog `/blog` and `/blog/[slug]` (SEO, Bangla articles)
Simple posts with cover image, rich text, tags. Seed 2 draft titles: "MBBS এর পর আল্ট্রাসাউন্ড কোর্স কেন করবেন", "CMU ও DMU কোর্সের পার্থক্য".

### 5.15 FAQ `/faq`
Accordion, admin-managed. Seed questions:
- কারা ভর্তি হতে পারবেন? (MBBS বা সমমান, ইন্টার্ন ডাক্তারও)
- সার্টিফিকেট কি সরকার স্বীকৃত? (Govt approved institute, code 57125; certificate note per course)
- কিস্তিতে পেমেন্ট করা যায়? (হ্যাঁ, ৫০% ভর্তির সময়, বাকিটা মাসিক কিস্তিতে)
- ভর্তির আগে ক্লাস দেখা যায়? (হ্যাঁ, ফ্রি ক্লাস)
- ক্লাস কোন দিন হয়? (`TODO`)
- রিয়েল পেশেন্টে প্র্যাকটিস হয়? (হ্যাঁ, প্রতিটি ক্লাসে)

### 5.16 Contact `/contact`
Address, phones (tap to call), WhatsApp, email, Facebook, office hours, map embed, contact form (name, phone, message) saved as `Application type=CONTACT`.

### 5.17 Downloads `/downloads`
Admin-uploaded PDFs: admission form, routines, prospectus.

### 5.18 Legal
`/privacy` and `/terms`, simple rich text pages from admin Pages.

---

## 6. Data model (Prisma schema)

```prisma
enum Role { SUPER_ADMIN STAFF }
enum CourseLevel { CERTIFICATE DIPLOMA SPECIAL }
enum ApplicationType { ADMISSION FREE_CLASS CONTACT }
enum ApplicationStatus { NEW CONTACTED ADMITTED CLOSED }
enum NoticeCategory { ADMISSION EXAM RESULT HOLIDAY GENERAL }
enum BatchStatus { UPCOMING RUNNING COMPLETED }
enum StudentStatus { ACTIVE COMPLETED DROPPED }

model User { id String @id @default(cuid()); email String @unique; name String; passwordHash String; role Role @default(STAFF); active Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }

model SiteSetting { id Int @id @default(1); json Json } // single row, see section 7.11

model Course {
  id String @id @default(cuid()); slug String @unique; code String // CMU, CMU-BTEB, DMU, ADMU, TVS, DOPPLER, ANOMALY
  nameEn String; nameBn String; fullNameEn String; fullNameBn String
  level CourseLevel; durationMonths Int; durationLabelEn String; durationLabelBn String
  courseFee Int; examFee Int?; formFee Int?; bookFee Int?; offerPrice Int?; offerLabelEn String?; offerLabelBn String?
  lectureClasses Int?; practicalClasses Int?
  overviewEn String? @db.Text; overviewBn String? @db.Text // HTML
  eligibilityEn String? @db.Text; eligibilityBn String? @db.Text
  certificateNoteEn String?; certificateNoteBn String?
  affiliationNote String? // e.g. "BTEB approved"
  image String?; admissionOpen Boolean @default(true); published Boolean @default(true); featured Boolean @default(false); sortOrder Int @default(0)
  metaTitle String?; metaDescription String?
  routines CourseRoutine[]; batches Batch[]; applications Application[]; students Student[]
  createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
}

model CourseRoutine { id String @id @default(cuid()); courseId String; course Course @relation(fields:[courseId], references:[id], onDelete: Cascade); semester String? // "1st Semester" etc
  label String // "Lecture 1", "Practical 2"
  title String; type String // LECTURE | PRACTICAL | EXAM | REVIEW
  sortOrder Int @default(0) }

model Batch { id String @id @default(cuid()); courseId String; course Course @relation(...); name String // "DMU Batch, Session 2026"
  startDate DateTime?; endDate DateTime?; status BatchStatus @default(UPCOMING); seats Int?; classDays String?; classTime String?; note String?; published Boolean @default(true)
  students Student[]; results Result[] }

model Application { id String @id @default(cuid()); type ApplicationType; status ApplicationStatus @default(NEW)
  name String; phone String; whatsapp String?; email String?; courseId String?; course Course? @relation(...); batchId String?
  qualification String?; bmdc String?; location String?; preferredDate DateTime?; message String? @db.Text
  adminNote String? @db.Text; source String? // utm
  createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }

model Student { id String @id @default(cuid()); roll String @unique; certificateNo String? @unique; name String; phone String?; courseId String; course Course @relation(...); batchId String?; batch Batch? @relation(...)
  admissionDate DateTime?; completionDate DateTime?; status StudentStatus @default(ACTIVE); resultGrade String?; verifiable Boolean @default(false); note String? }

model Result { id String @id @default(cuid()); title String; batchId String?; batch Batch? @relation(...); courseId String?; examDate DateTime?; fileUrl String?; bodyHtml String? @db.Text; published Boolean @default(false); createdAt DateTime @default(now()) }

model Notice { id String @id @default(cuid()); slug String @unique; titleBn String; titleEn String?; bodyBn String @db.Text; bodyEn String? @db.Text; category NoticeCategory @default(GENERAL); pinned Boolean @default(false); publishedAt DateTime @default(now()); expiresAt DateTime?; published Boolean @default(true); attachments Json? // [{name,url}]
}

model Faculty { id String @id @default(cuid()); name String; nameBn String?; degrees String; designation String; designationBn String?; bio String? @db.Text; photo String?; sortOrder Int @default(0); published Boolean @default(true) }

model Testimonial { id String @id @default(cuid()); name String; batch String?; course String?; text String @db.Text; photo String?; rating Int @default(5); published Boolean @default(true); sortOrder Int @default(0) }

model GalleryAlbum { id String @id @default(cuid()); slug String @unique; title String; titleBn String?; cover String?; sortOrder Int @default(0); images GalleryImage[] }
model GalleryImage { id String @id @default(cuid()); albumId String; album GalleryAlbum @relation(...); url String; caption String?; sortOrder Int @default(0) }

model Faq { id String @id @default(cuid()); questionBn String; questionEn String?; answerBn String @db.Text; answerEn String? @db.Text; courseId String?; sortOrder Int @default(0); published Boolean @default(true) }

model Post { id String @id @default(cuid()); slug String @unique; titleBn String; titleEn String?; excerpt String?; bodyBn String @db.Text; bodyEn String? @db.Text; cover String?; tags String[]; published Boolean @default(false); publishedAt DateTime? }

model Page { id String @id @default(cuid()); slug String @unique; titleBn String; titleEn String?; bodyBn String @db.Text; bodyEn String? @db.Text; published Boolean @default(true) } // about story, privacy, terms

model Download { id String @id @default(cuid()); title String; fileUrl String; category String?; sortOrder Int @default(0); published Boolean @default(true) }

model Partner { id String @id @default(cuid()); name String; type String // AFFILIATION | COLLABORATION
  logo String?; description String?; url String?; sortOrder Int @default(0) }

model Banner { id String @id @default(cuid()); title String?; subtitle String?; image String; link String?; sortOrder Int @default(0); active Boolean @default(true) }

model ActivityLog { id String @id @default(cuid()); userId String; action String; entity String; entityId String?; createdAt DateTime @default(now()) }
```

---

## 7. Admin panel `/admin`

Protected by Auth.js middleware. Login at `/admin/login`. Layout: left sidebar (collapsible on mobile), top bar with user name, "View site" link, logout. Use shadcn Table, Dialog, Form, Tabs, Toast. All lists have search, pagination, and a Published toggle where applicable. All forms have BN and EN tabs for bilingual fields.

7.1 **Dashboard**: cards for New applications (last 7 days), Total students, Running batches, Notices published; chart of applications per day (last 30 days); table of latest 10 applications with quick WhatsApp button (`wa.me/{phone}`) and status dropdown.

7.2 **Applications**: filters by type, status, course, date. Row actions: view, change status, add admin note, WhatsApp link, call link, delete. Export CSV. Bulk status change.

7.3 **Courses**: CRUD with tabs: Basics, Fees, Content (rich text BN/EN), Routine (inline sortable table: semester, label, title, type), SEO. Reorder via drag. Duplicate course action.

7.4 **Batches**: CRUD, linked to course, status, start date, seats, class days/time. "Next batch" on homepage is the earliest UPCOMING published batch.

7.5 **Students** (Phase 1 minimal, Phase 2 full): CRUD, roll, certificate no, course, batch, status, completion date, `verifiable` toggle. CSV import (columns: roll, certificateNo, name, phone, courseCode, batchName, completionDate). Used by public /verify.

7.6 **Results**: CRUD, attach PDF or write table HTML, publish toggle.

7.7 **Notices**: CRUD with rich text, category, pinned, publish date, expiry, attachments. Expired notices auto-hide publicly.

7.8 **Faculty, Testimonials, FAQ, Partners, Banners, Downloads**: simple CRUD each with image upload and sortOrder.

7.9 **Gallery**: albums, multi-image upload with drag-and-drop, reorder, caption, set cover.

7.10 **Blog** and **Pages**: rich text CRUD.

7.11 **Site Settings** (single JSON form, grouped tabs):
- General: institute names BN/EN, tagline BN/EN, established year, govt code, "years of success" label auto-computed
- Contact: address BN/EN, phone1, phone2, whatsapp number, email, facebook URL, YouTube URL (optional), map embed URL or lat/lng, office hours BN/EN
- Homepage: hero title/sub BN/EN, hero image, stats (doctors trained number, show/hide), announcement bar text + link + active + color
- WhatsApp: default prefilled message BN/EN
- SEO: default meta title/description BN/EN, OG image
- Integrations: GA4 ID, Meta Pixel ID, SMTP host/port/user/pass (pass stored encrypted or via env only; prefer env), notification email(s)
- Footer: about line BN/EN

7.12 **Users**: SUPER_ADMIN only. Create staff, reset password, deactivate.

7.13 **Media library**: list uploads, delete unused.

7.14 **Activity log**: who changed what.

---

## 8. Seed data (run on first deploy via `prisma db seed`)

Admin user: email from env `ADMIN_EMAIL`, password from env `ADMIN_PASSWORD`, role SUPER_ADMIN.

Site settings: all values from section 3.

Partners:
- Affiliation: Bangladesh Technical Education Board (BTEB) ; Ministry of Education, Govt. of the People's Republic of Bangladesh
- Collaboration: World Association of Ultrasound in Combined Medicine (WAUCM) ; Jonosastho Pacific Limited
- Logos: `TODO` (placeholder initials)

### Courses (7)

> NOTE TO BUILDER: The owner gave headline fees that differ slightly from the official admission PDFs. Seed the values below exactly. The admin can change any number later. Do not invent discounts. Where `offerPrice` is null, no strikethrough is shown.

| code | slug | nameEn | fullNameEn | fullNameBn | level | durationMonths | courseFee | examFee | formFee | bookFee | lectures | practicals | offerPrice | offerLabel |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CMU | cmu-regular | CMU (Regular) | Certificate in Medical Ultrasound | সার্টিফিকেট ইন মেডিকেল আল্ট্রাসাউন্ড (রেগুলার) | CERTIFICATE | 3 | 11000 | 1550 | 200 | 850 | 6 | 7 | null | null |
| CMU-BTEB | cmu-bteb | CMU (BTEB) | Certificate in Medical Ultrasound (BTEB approved) | সার্টিফিকেট ইন মেডিকেল আল্ট্রাসাউন্ড (বিটিইবি) | CERTIFICATE | 6 | 30750 | 5350 | 200 | 850 | 10 | 20 | null | null |
| DMU | dmu | DMU | Diploma in Medical Ultrasound | ডিপ্লোমা ইন মেডিকেল আল্ট্রাসাউন্ড | DIPLOMA | 12 | 70750 | 5350 | 200 | 850 | 20 | 26 | null | null |
| ADMU | admu | ADMU | Advanced Diploma in Medical Ultrasound | অ্যাডভান্সড ডিপ্লোমা ইন মেডিকেল আল্ট্রাসাউন্ড | DIPLOMA | 12 | 100000 | null | null | null | null | null | null | null |
| TVS | tvs | TVS | Certificate in Transvaginal Ultrasound | ট্রান্সভ্যাজাইনাল আল্ট্রাসাউন্ড সার্টিফিকেট কোর্স | SPECIAL | 3 | 30000 | null | null | null | null | null | null | null |
| DOPPLER | color-doppler | Color Doppler | Color Doppler Ultrasound Course | কালার ডপলার আল্ট্রাসাউন্ড কোর্স | SPECIAL | `TODO` (seed 0, show "Contact for details") | 0 | null | null | null | null | null | null | null |
| ANOMALY | anomaly-scan | Anomaly Scan | Anomaly Scan Course | অ্যানোমালি স্ক্যান কোর্স | SPECIAL | `TODO` (seed 0) | 0 | null | null | null | null | null | null | null |

Display rule: if `courseFee == 0` show "Contact for fee" and hide the fee table. If `durationMonths == 0` show "Duration: contact office".

Owner-stated headline totals for reference (admin may prefer these as all-inclusive display): CMU Regular 13,500; CMU BTEB 37,500; DMU 80,000 (owner said 6 months; PDFs and BTEB letter say 1 year, seeded as 12); ADMU 1,00,000; TVS 30,000. Put this note in the admin course form help text.

`certificateNoteBn` for CMU-BTEB: "কোর্স শেষে সফলভাবে উত্তীর্ণদের জন্য সরকারি সনদপত্র প্রদান করা হবে।" For others: "কোর্স শেষে প্রতিষ্ঠানের সনদপত্র প্রদান করা হয়।" (`TODO` confirm wording with owner).

`eligibilityBn` all: "ন্যূনতম যোগ্যতা MBBS বা সমমান। ইন্টার্ন ডাক্তাররাও আবেদন করতে পারবেন।"

### Course routines (seed exactly)

**CMU Regular** (semester null): L1 Basic Physics & Liver Ultrasound; P2 Practical on real patients; L3 GB, Spleen & Pancreas; P4 Practical; L5 Kidney, Urinary Bladder; P6 Practical; L7 Uterus & Ovary; P8 Practical; L9 Pregnancy Ultrasound Part 1; P10 Practical; L11 Pregnancy Ultrasound Part 2 (Late); P12 Practical; L13 Review & Reporting; EXAM Final Exam.

**CMU BTEB**: L1 Basic Physics of Ultrasound; P2; L3 Liver; P4; L5 GB, Spleen; P6; L7 Pancreas; P8; L9 Kidney; P10; L11 Urinary Bladder, Prostate; P12; L13 Uterus; P14; L15 Ovary; P16; L17 Early Pregnancy; P18; L19 Late Pregnancy; P20; L21 Review & Report Writing; P22; EXAM Model Test; P23 to P30 Practical on real patients; EXAM Final Exam. (Every P = "Practical class of ultrasonography on real patients".)

**DMU**
- 1st Semester: L1 Basic Physics Part 1; L2 Basic Physics Part 2; L3 Liver Part 1; L4 Liver Part 2; L5 Gall Bladder Part 1; L6 Gall Bladder Part 2; L7 Spleen; L8 Pancreas; L9 First Semester Review; EXAM 1st Semester Examination.
- 2nd Semester: L11 Kidney Part 1; L12 Kidney Part 2; L13 Urinary Bladder; L14 Prostate; L15 Uterus Part 1; L16 Uterus Part 2; L17 Ovary Part 1; L18 Ovary Part 2; L19 Review & Report Writing; EXAM 2nd Semester Examination.
- 3rd Semester: L21 Early Pregnancy Part 1; L22 Pregnancy Part 2; L23 Late Pregnancy Part 3; L24 Colour Doppler Physics Part 1; L25 Colour Doppler Physics Part 2; L26 Abdomen Doppler; L27 Pregnancy Doppler; L28 USG of Breast (Basic); L29 USG of Testis (Basic); L30 TVS / Echocardiogram (Basic); L31 Review & Report Writing; P32 to P40 Hands-on training on real patients; EXAM Final Examination.

ADMU: copy DMU routine and add a note "Advanced modules: `TODO`". TVS, Doppler, Anomaly: no routine seeded.

Batches: one UPCOMING batch per CMU-BTEB, CMU, DMU named "{code} Batch, Session 2026", startDate `TODO` (null, display "Starting soon").

Notices (2): "ভর্তি চলছে: CMU ও DMU কোর্স, সেশন ২০২৬" (ADMISSION, pinned); "ভর্তির আগে ফ্রি ক্লাসের সুযোগ" (GENERAL).

FAQ: section 5.15. Pages: about-story, privacy, terms (short generic text). Testimonials, Faculty, Gallery: empty (public sections hide when empty).

---

## 9. Bilingual copy rules
- Store BN and EN separately. If EN is empty, fall back to BN.
- Numbers in Bangla UI: render fees as "৳ ৩০,৭৫০" using Bangla digits via a helper; English UI: "Tk 30,750".
- Dates: BN "১২ সেপ্টেম্বর ২০২৬", EN "12 Sep 2026".
- Language switch preserves the current path.

---

## 10. SEO and sharing
- `generateMetadata` on every page from DB fields, fallback to site defaults.
- OG image per course auto-generated with `next/og`: logo, course name, fee, "Govt. Code 57125".
- `sitemap.xml`, `robots.txt`, canonical, `hreflang` bn/en.
- JSON-LD: `EducationalOrganization` on home (name, address, phones, logo, sameAs Facebook), `Course` on course pages, `FAQPage` on /faq.
- Target keywords (Bangla + English): "ultrasound course mymensingh", "CMU course bangladesh", "DMU course", "আল্ট্রাসাউন্ড কোর্স ময়মনসিংহ", "ডাক্তারদের আল্ট্রাসাউন্ড ট্রেনিং".
- Image optimization via `next/image`, lazy loading, webp.

---

## 11. Security and quality
- Admin routes protected by middleware; CSRF handled by Auth.js; passwords bcrypt cost 12.
- Public forms: zod validation server-side, honeypot, rate limit (in-memory or Postgres table), phone regex `^(\+?88)?01[3-9]\d{8}$`, normalize to `+8801XXXXXXXXX`.
- Uploads: allow jpg/png/webp/pdf, max 10 MB, random filenames, no path traversal.
- Environment variables (`.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `UPLOAD_DIR`.
- Lighthouse targets: Performance 90+, Accessibility 95+, SEO 100 on mobile.
- Tests: Vitest unit tests for phone normalizer, Bangla digit helper, fee total; Playwright smoke tests: home loads, course page renders fee table, apply form submits, admin login and create notice.
- ESLint + Prettier, TypeScript strict.

---

## 12. Deployment (Coolify)
- Repo root: `Dockerfile` (node:20-alpine, multi-stage, `output: 'standalone'`), `docker-compose.yml` for local dev with Postgres.
- Coolify: create Postgres service; create app from Git repo; set env vars; add persistent volume `/app/uploads`; healthcheck `GET /api/health`.
- Start command runs `prisma migrate deploy` then `node server.js`. Seed runs only if `User` table is empty.
- Domain: `TODO` (owner to buy, e.g. mutibd.com; poster domain "MUTI.Ultrasound.com" is invalid). Cloudflare proxy + SSL.
- Backups: nightly `pg_dump` cron in Coolify to the volume, keep 14 days.

---

## 13. Delivery order for the builder
1. Scaffold Next.js + Tailwind + shadcn + Prisma + Auth.js, Docker, health route. Commit.
2. Prisma schema + migrations + seed (section 8). Commit.
3. Design system, layout, header/footer, i18n, WhatsApp float, announcement bar.
4. Public pages in this order: Home, Courses, Course detail, Admission/Apply, Contact, Notices, About, Accreditation, FAQ, Gallery, Faculty, Downloads, Results, Verify, Blog, legal.
5. Admin: auth, layout, Dashboard, Applications, Courses (+routine), Batches, Notices, Site Settings, then the rest of CRUDs, Students + CSV import, Users, Media, Activity log.
6. SEO, JSON-LD, OG images, sitemap.
7. Tests, Lighthouse pass, README with setup, env, and "how staff use the admin" guide in Bangla.
8. Final handover list of every `TODO` item still needing real content.

---

## 14. Phase 2 ideas (do not build now, keep the schema compatible)
- Online fee payment via bKash / Nagad / SSLCommerz with receipt email
- Student portal: login by phone + OTP, view routine, due installments, results, download certificate
- SMS notifications (e.g. BulkSMS BD) for class reminders and installment due on the 1st
- QR code printed on certificates linking to /verify?no=...
- WhatsApp Business API auto-reply
- Seminar / workshop event registration with seat count
- Alumni and placement showcase
- Google Reviews embed
- EMI calculator on course pages
- Facebook Lead Ads webhook into Applications

# Addendum 5: Course Book ("Easy Ultrasound") on the website

**For the AI maintaining the live MUTI site. Read the main spec and Addendums 1 to 4 first. English is the primary language, Bangla optional with fallback. Light theme only. No em dashes anywhere.**

## Context

MUTI has its own course book: "Easy Ultrasound (Abdomen & Pregnancy)", used in CMU and DMU 1st semester. 13 chapters, roughly 66 pages, question and answer style with ultrasound images. The book is paid course material (book fee Tk 850), so the website must use it to show value and capture leads, not give it away. Part A is public and goes in the current build. Part B is for the student portal (Phase 2) and must not be built now.

## Table of contents (use exactly)

01 USG Physics
02 USG of Liver
03 USG of Gall Bladder and CBD
04 USG of Pancreas
05 USG of Spleen
06 USG of Kidneys
07 USG of Urinary Bladder
08 USG of Prostate
09 USG of Uterus
10 USG of Adnexa (Ovary)
11 USG of Cul-de-sac / Pouch of Douglas
12 USG of Early Pregnancy
13 USG of Late Pregnancy

Fix the book's spelling in all site copy: "Physics" not "Physic", "Cul-de-sac" not "Cal De Sac", "Adnexa" as is.

---

## PART A: build now

### A1. Data

```prisma
model CourseBook {
  id String @id @default(cuid())
  slug String @unique            // easy-ultrasound
  title String                   // Easy Ultrasound
  subtitle String?               // Abdomen & Pregnancy
  edition String?                // 2026
  coverImage String?
  description String? @db.Text   // HTML
  descriptionBn String? @db.Text
  pages Int?
  priceNote String?              // "Included in book fee (Tk 850)"
  samplePdfFileId String?        // the free sample chapter PDF (Media)
  sampleChapterTitle String?     // "Chapter 01: USG Physics"
  published Boolean @default(false)
  chapters CourseBookChapter[]
  courses CourseBookOnCourse[]   // which courses use it
}
model CourseBookChapter {
  id String @id @default(cuid())
  bookId String; book CourseBook @relation(...)
  number Int; title String; titleBn String?
  summary String?                // one line: what the chapter covers
  topics String[]                // 3 to 6 keywords, e.g. ["Echogenicity", "Probe types", "Artifacts"]
  isSample Boolean @default(false)
  sortOrder Int @default(0)
  @@unique([bookId, number])
}
model CourseBookOnCourse { bookId String; courseId String; @@id([bookId, courseId]) }
```

`Application.type` gets a new value `BOOK_SAMPLE`.

### A2. Seed

One CourseBook: slug `easy-ultrasound`, title "Easy Ultrasound", subtitle "Abdomen & Pregnancy", subtitle line "CMU and DMU 1st Semester course book", pages 66, priceNote "Included in the book fee", linked to courses CMU, CMU-BTEB, DMU, ADMU. 13 chapters from the list above with these summaries and topics:

| #   | Title                       | Summary                                                                                                               | Topics                                                                                        |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | USG Physics                 | Sound, ultrasound frequency, echogenicity types, artifacts, machine parts, probe types                                | Echogenicity, Posterior shadow and enhancement, Linear / convex / sector probes, Coupling gel |
| 2   | USG of Liver                | Normal size, patient preparation, hepatitis, CLD, fatty liver, cysts, abscess, tumours, portal hypertension           | Hypoechoic vs hyperechoic liver, Fine vs coarse granular, Hydatid cyst, HCC, Metastasis       |
| 3   | USG of Gall Bladder and CBD | Normal measurements, cholecystitis, gallstones, polyp, mass, choledocholithiasis                                      | GB wall thickness, Stone with shadow, CBD stone                                               |
| 4   | USG of Pancreas             | Normal size, calcification, pancreatitis, cyst, abscess, tumours, duct dilatation                                     | Acute vs chronic pancreatitis, Adenocarcinoma, Pancreatic duct                                |
| 5   | USG of Spleen               | Normal size by age, splenomegaly grading, cyst, abscess, calcification, lymphoma, trauma                              | Splenomegaly stages, Amoebic vs pyogenic abscess                                              |
| 6   | USG of Kidneys              | Normal appearance and size, hydronephrosis grading, stone, cyst, CKD, PUJ obstruction, tumours                        | Hydronephrosis mild / moderate / marked, RCC, Wilms tumour                                    |
| 7   | USG of Urinary Bladder      | Wall and volume measurement, cystitis, polyp, mass, stone, diverticulum                                               | MCC, Volume formula, Debris                                                                   |
| 8   | USG of Prostate             | Normal size and volume, BEP grading, carcinoma, cyst, abscess, PVR                                                    | BEP vs carcinoma, Volume formula, Post-void residual                                          |
| 9   | USG of Uterus               | Normal size by age and parity, fibroid types, endometrial thickness, hyperplasia, polyp, carcinoma, adenomyosis, IUCD | Fibroid types, Endometrial thickness by phase, Endometritis                                   |
| 10  | USG of Adnexa               | Ovary size and volume, follicles, cysts, PCOS, dermoid, endometrioma, mass                                            | Follicular cyst, Haemorrhagic cyst, PCOS, Dermoid                                             |
| 11  | USG of Cul-de-sac           | Pouch of Douglas fluid, PID                                                                                           | Free fluid, PID                                                                               |
| 12  | USG of Early Pregnancy      | Gestational sac, yolk sac, fetal pole, CRL, blighted ovum, early pregnancy report format                              | GS viability, CRL, Blighted ovum, Report writing                                              |
| 13  | USG of Late Pregnancy       | BPD, FL, AC, AFI, placenta grading, fetal weight by week, late pregnancy report, abortion types, FDIU                 | AFI ranges, Placenta grade 0 to III, Missed / incomplete abortion, FDIU                       |

Chapter 1 `isSample = true`. Sample PDF: `TODO` owner uploads Chapter 01 as a separate PDF (with MUTI header and "Sample chapter, not for resale" footer on each page, added at upload time with pdf-lib). Book stays unpublished until the owner uploads the cover and sample PDF.

### A3. Public pages

**Page `/course-book/easy-ultrasound`** (EN) and `/bn/...`. Design like a clean product page, not a shop:

1. Hero: left, book cover (3D tilt effect on hover, soft shadow, 320px wide; on mobile 220px centered). Right: title, subtitle, "CMU and DMU 1st Semester course book", 3 badges ("13 chapters", "66 pages", "Included with the course"), short paragraph: "Written by MUTI faculty in simple question and answer style, this is the book every CMU and DMU student learns from. Abdomen and pregnancy scanning, normal measurements, pathology and report writing." Two buttons: "Download free sample chapter" (accent) and "View courses" (outline).
2. Chapter list: 13 rows, two columns on desktop, one on mobile. Each row: number in a navy circle, title, one-line summary, topic chips (muted). Chapter 1 has a green "Free sample" badge. Rows are not links (no content on the site).
3. "What you get" strip (4 icons): Normal measurements for every organ; Sonographic findings of common pathology; Ready-to-use report formats; Exam-oriented questions and answers.
4. Who it is for: MBBS doctors and interns in CMU / DMU; also useful revision for any doctor starting ultrasound.
5. Sample chapter form (section A4).
6. CTA: "Get the full book with your admission" with course cards (CMU Regular, CMU BTEB, DMU) showing fee and duration, plus WhatsApp button prefilled "I want to know about the Easy Ultrasound course book and CMU/DMU admission".
7. SEO: title "Easy Ultrasound course book by MUTI | Abdomen and Pregnancy", meta description, OG image = cover, JSON-LD `Book` (name, author "MUTI faculty", publisher "Mymensingh Ultrasound Training Institute", inLanguage en).

**Course detail pages** (all courses linked to the book): add a section "Course book" after the routine table: cover thumbnail, title, "13 chapters, included in the book fee", 5 chapter titles then "and 8 more", link to the book page. For DMU add the line "Used in 1st semester".

**Homepage**: under the "Why choose MUTI" section add a slim strip (light background, cover thumbnail left, text right): "Our own course book: Easy Ultrasound. Download a free sample chapter." Button to the book page. Toggle in Site Settings `home.showBook`.

**Nav**: under Courses dropdown add "Course book". Footer Programs column add "Course book".

### A4. Sample chapter lead capture

- Form on the book page (and reachable as `/course-book/easy-ultrasound/sample`): name*, phone*, email (optional, used to send the PDF link), qualification* (MBBS / Intern / Other), interested course (select, optional), consent checkbox "Contact me about admission". Turnstile + rate limit 5/hour/IP.
- On submit: create `Application` with `type = BOOK_SAMPLE`, `source` from UTM logic (Addendum 2 A3). Show success card: "Your sample chapter is ready" with a download button that hits `/api/v1/book/sample?token=...` (signed token valid 24 hours, one per submission, logs downloads). If email given, send it too via `notify('BOOK_SAMPLE')` with the same link. WhatsApp button prefilled "I downloaded the Easy Ultrasound sample chapter, I want to know about admission".
- The PDF is never linked directly; the token route streams it from Media.
- Admin: Applications list gets a BOOK_SAMPLE filter and a "Downloads" count column for those rows. Dashboard "Leads by source" already covers it; add a small tile "Sample downloads this month".

### A5. Blog seed from the book (SEO)

Create 8 draft blog posts (unpublished, EN required, BN optional), each 500 to 800 words, written fresh in plain language from the book's topics, not copied, with one line "Learn this hands-on in the MUTI CMU course" and a link at the end. Titles:

1. Echogenicity explained: hyperechoic, hypoechoic and anechoic in ultrasound
2. Posterior acoustic shadow vs enhancement: how to tell stone from cyst
3. Fatty liver vs chronic liver disease on ultrasound: how to differentiate
4. Normal liver, spleen and kidney measurements every new sonologist should know
5. Grading hydronephrosis on ultrasound: mild, moderate and marked
6. How to measure prostate volume and post-void residual on ultrasound
7. Endometrial thickness by menstrual phase: normal values
8. AFI and placenta grading in late pregnancy: a quick guide

Mark them "Needs faculty review" in admin (a boolean `needsReview` on Post, shown as a badge) so a doctor approves before publishing. Do not publish automatically.

### A6. Copyright rule for images

Do not upload any image from the book PDF to the public site. Many of the book's scan images were collected from the internet. Public pages use only: the book cover (owner supplies, `TODO`), icons, and MUTI's own photos. The blog posts use no ultrasound images until the office provides scans from their own machine (a `TODO` note in each draft).

### A7. Admin

- Menu "Course Book": edit book details, upload cover, upload sample PDF (auto-stamps header/footer), chapter list with inline edit and reorder, link to courses, publish toggle.
- Media library tags the sample PDF as `protected` so it is never served by the public `/uploads` route, only via the token route.

### A8. Acceptance

- Book page renders on desktop and mobile with cover, 13 chapters, sample form; unpublished state returns 404.
- Submitting the sample form creates a BOOK_SAMPLE application, shows the download button, and the direct PDF URL is not guessable.
- Course pages show the course book section; homepage strip toggles from settings.
- 8 blog drafts exist with `needsReview = true` and no images.
- Lighthouse and no-em-dash checks pass.

---

## PART B: Phase 2 only (student portal), do not build now

Keep the schema compatible; nothing below is in scope until "start Phase 2" is said.

### B1. Digital course book in the portal

- `CourseBookContent(chapterId, bodyHtml, images Media[], version)` stores each chapter as HTML (converted from the book by the office, faculty reviewed).
- Portal page `/portal/book`: chapter list, reader with next/previous, progress per student (`BookProgress(studentId, chapterId, completedAt)`), search within the book.
- Access: only students with status ACTIVE or COMPLETED in a course linked to the book. Copy and download disabled in the reader (best effort: no PDF export, text selection off, watermark overlay with roll number and phone on every page, right-click disabled, images served with the roll number stamped by sharp at request time).

### B2. MCQ practice bank from the book

- `Question(chapterId, stem, options Json, correctIndex, explanation, difficulty, reviewed Boolean)`; seed by generating 10 to 15 questions per chapter from the book's Q&A (e.g. "Which probe is best for superficial structures?", "Normal AFI range?", "Grade II BEP weight?"), all `reviewed = false` until faculty approves.
- Portal: practice by chapter, timed mock (30 questions), score history, weakest chapters shown. Admin: question CRUD, bulk CSV import, approve.

### B3. Case image practice

- `CaseImage(chapterId, imageId, findingLabel, options Json, explanation, source CONSENTED_PATIENT)`; only images from MUTI's own machine with patient consent. Portal quiz "What is the finding?".

### B4. Teacher tools

- Mark a chapter as "covered in class" per batch (links to ClassSession); students see which chapters are done and what to read before the next class.

### B5. Permissions

`book.manage`, `book.content.edit`, `questions.manage`, `questions.approve`.

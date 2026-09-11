# Addendum 3: Verification, Results Search, CSV Import, Leadership, Advisory Board, Hero Slider

**For the AI maintaining the live MUTI site. Read `muti-website-build-spec.md`, `muti-erp-addendum.md`, `muti-addendum-2-advanced-features.md` first. This addendum is Phase 1.5: build now, on the live site, behind feature toggles where noted. Keep light theme, bilingual, mobile-first.**

---

## 1. Certificate verification: by Certificate No OR BMDC No

### Data
- `Student` already has `bmdc String?`. Add `@@index([bmdc])`.
- `Certificate` model (from Addendum 2 B4) is needed now in minimal form:
  ```prisma
  model Certificate {
    id String @id @default(cuid())
    certificateNo String @unique      // as printed on the certificate, e.g. BTEB roll-based or MUTI-C-2026-0117
    studentId String
    student Student @relation(...)
    courseId String
    course Course @relation(...)
    batchName String?
    type COURSE | SEMESTER | BOARD     // BOARD = BTEB issued, MUTI only records it
    issuedAt DateTime?
    session String?                   // "Jan-June 2025"
    grade String?                     // e.g. "4.00"
    verifyToken String @unique @default(cuid())
    status VALID | REVOKED @default(VALID)
    revokedReason String?
    fileId String?                    // optional scanned copy, never shown publicly
    createdAt, updatedAt, deletedAt?
  }
  ```

### Public page `/verify`
Layout like the reference: heading "Certificate Verification / সার্টিফিকেট যাচাই", subtitle "Enter a MUTI Certificate No or BMDC No to verify authenticity. If you cannot find your certificate, please contact our office." Card with radio: **Certificate No** (default) | **BMDC No**, one input, Verify button. Helper text under input changes per radio.
- Certificate No: exact match on `Certificate.certificateNo` (trim, case-insensitive).
- BMDC No: match on `Student.bmdc` (normalize: strip spaces, dashes, leading "A-"; store normalized in `bmdcNormalized` column). May return multiple certificates; list all.
- Result card on success: green header "Verified / যাচাইকৃত", then: student name (full name when searched by exact certificate no or BMDC; no masking needed since the searcher already holds the number), course full name, session/batch, certificate no, issue date, grade if any, status. If REVOKED: red header "This certificate has been revoked" + reason.
- Not found: amber box "No record found. যদি আপনার সার্টিফিকেট খুঁজে না পান, অফিসে যোগাযোগ করুন" + WhatsApp button.
- Protection: Cloudflare Turnstile widget (site key + secret in Site Settings `security.turnstile`; if empty, skip) + rate limit 20 requests / minute / IP. Log every lookup to `VerificationLog(id, query, type, found Boolean, ip, createdAt)` for the admin to see abuse.
- QR support: `/verify?t={verifyToken}` auto-verifies and shows the same card.
- SEO: noindex the result state, index the empty page.

### Admin
- Certificates list: search, filter by course/status, add/edit, revoke with reason, bulk import (section 3), export CSV.
- Student page shows their certificates.

---

## 2. Results search: by Roll No OR Registration No

MUTI has two kinds of results:
1. **Board results** (BTEB) published by the board as a notification listing roll numbers with GPA (pass) or failed subject codes (fail). Example format from the board memo: pass rows `3825000128 (4.00)`, fail rows `3825000129 {01101[T], 01103[T]}`.
2. **Internal results** (MUTI semester/final exams, from Addendum 2 B3). Not required for this addendum; design the search so both appear later.

### Data
```prisma
model BoardExam {
  id String @id @default(cuid())
  title String              // "Certificate in Medical Ultrasound Examination 2025"
  session String            // "Jan-June 2025"
  heldIn String?            // "August 2025"
  memoNo String?            // "57.17.0000.304.35.012.14.553"
  publishedOn DateTime?
  courseId String?
  boardName String @default("Bangladesh Technical Education Board")
  noticeFileId String?      // the board PDF, downloadable publicly
  published Boolean @default(false)
  results BoardResult[]
}
model BoardResult {
  id String @id @default(cuid())
  boardExamId String
  boardExam BoardExam @relation(...)
  roll String               // 10 digits e.g. 3825000128
  registrationNo String?    // board registration no
  studentId String?         // optional link to Student (auto-match by roll if Student.boardRoll matches)
  studentName String?       // for display when no Student link
  status PASS | FAIL | WITHHELD | ABSENT
  gpa Decimal? @db.Decimal(4,2)
  failedSubjects String?    // raw text "01101[T], 01103[T,P], 02101[T,P]"
  remark String?
  @@unique([boardExamId, roll])
  @@index([roll]) @@index([registrationNo])
}
```
Add to `Student`: `boardRoll String? @unique`, `boardRegistrationNo String?` with index.

### Public page `/results`
- Heading "Result Search / ফলাফল অনুসন্ধান". Card with radio **Roll No** (default) | **Registration No**, exam selector (optional dropdown of published BoardExams, default "All"), input, Search button. Turnstile + rate limit as in verify.
- Result card: exam title, session, roll, registration (if present), student name (if linked), status badge (PASS green with GPA, FAIL red with failed subject list rendered as chips, WITHHELD grey), link "Download board notice (PDF)" if file present. Multiple exams for the same roll listed newest first.
- Not found message + contact.
- Below the search: list of published BoardExams as cards (title, session, date, "Download notice" button) so visitors can also browse.
- Subject code legend (admin-editable JSON in Site Settings `results.subjectCodes`, e.g. `{"01101":"Basic Physics","01103":"...","02101":"..."}`, `TODO` real names) shown as tooltip on chips; `[T]` = Theory, `[P]` = Practical.

### Admin
- Board Exams CRUD, upload notice PDF, publish toggle.
- Board Results per exam: table with inline edit, add row, delete, bulk import (section 3), "Auto-link students by roll" button, export CSV.
- Parser helper (optional, nice to have): paste the board notice text, click "Parse", it extracts `roll (gpa)` as PASS and `roll {codes}` as FAIL into the table for review before save. Regex: pass `(\d{10})\s*\(\s*([\d.]+)\s*\)`, fail `(\d{10})\s*\{([^}]*)\}`.

---

## 3. CSV / Excel import with downloadable templates (all bulk data)

One reusable import system used by Students, Certificates, Board Results, and later Marks/Attendance.

### Behaviour
- Admin page `/admin/import` and an "Import" button on each supporting list page.
- Step 1: choose entity, download template (`.xlsx` and `.csv` both offered; generated on the fly with headers, one example row, and a second sheet "Instructions" in Bangla + English). Templates are also editable manually, so the same columns are accepted from any spreadsheet.
- Step 2: upload `.csv` or `.xlsx` (parse with `papaparse` / `xlsx` (SheetJS)). Header matching is case-insensitive and ignores spaces/underscores.
- Step 3: preview table with per-row validation (zod). Rows with errors highlighted with message; option "Skip invalid rows and import the rest" or "Fix and re-upload". Duplicate handling select: **Skip duplicates** | **Update existing** (match key per entity).
- Step 4: import in a transaction per chunk of 200 rows. Show summary: created, updated, skipped, errors. Save an `ImportJob(id, entity, fileName, uploadedById, total, created, updated, skipped, errors Json, createdAt)` and log to ActivityLog. Errors downloadable as CSV.
- Manual entry always remains available via the normal add/edit forms.

### Templates (columns, * = required, match key in bold)
- **Students**: **roll***, name*, name_bn, phone*, email, gender, dob (YYYY-MM-DD), father_name, mother_name, nid, bmdc, address, course_code* (CMU, CMU-BTEB, DMU, ADMU, TVS, DOPPLER, ANOMALY), batch_name, admission_date, status (ACTIVE|COMPLETED|DROPPED), board_roll, board_registration_no
- **Certificates**: **certificate_no***, roll* (student must exist) OR bmdc, course_code*, type (COURSE|SEMESTER|BOARD), session, batch_name, issued_at (YYYY-MM-DD), grade, status (VALID|REVOKED), revoked_reason
- **Board Results**: exam is chosen in the UI, then columns: **roll***, registration_no, student_name, status* (PASS|FAIL|WITHHELD|ABSENT), gpa, failed_subjects, remark
- **Faculty / Advisors** (optional): name*, name_bn, degrees, designation*, designation_bn, organization, photo_url, sort_order
- Phone normalization and Bangla digit tolerance (০-৯ converted to 0-9) apply to all numeric fields.

Permission: `import.run`. Max file 5 MB, max 20,000 rows per file.

---

## 4. Leadership messages (Chairman, Managing Director, and others)

### Data
```prisma
model LeadershipMessage {
  id String @id @default(cuid())
  key String @unique            // CHAIRMAN | MANAGING_DIRECTOR | DIRECTOR | PRINCIPAL | custom slug
  roleTitleBn String            // "প্রতিষ্ঠান চেয়ারম্যান"
  roleTitleEn String            // "Chairman"
  personName String; personNameBn String?
  degrees String?; designationLine String?   // e.g. "MBBS, DMU, Sonologist"
  photo String?
  messageBn String @db.Text; messageEn String? @db.Text   // HTML from Tiptap
  excerptBn String?; excerptEn String?      // 2 lines for homepage card
  signatureImage String?
  sortOrder Int @default(0); published Boolean @default(false)
}
```
Seed two unpublished rows: CHAIRMAN ("প্রতিষ্ঠান চেয়ারম্যান এর বক্তব্য" / "Message from the Chairman") and MANAGING_DIRECTOR ("ব্যবস্থাপনা পরিচালক এর বক্তব্য" / "Message from the Managing Director"). All fields `TODO`; hidden until published.

### Public
- Homepage section "নেতৃত্বের বক্তব্য / Messages from Leadership": two side-by-side cards (photo, name, role, excerpt, "Read full message"). On mobile stacked. Hidden if none published.
- Page `/messages/[key]` (e.g. `/messages/chairman`) with full message, photo, signature. Also listed in About page and in nav under About dropdown: "Chairman's Message", "MD's Message".
- Admin: CRUD with rich text, photo upload, publish toggle, reorder. Adding a new key (e.g. PRINCIPAL) creates a new page automatically.

---

## 5. Advisory board (উপদেষ্টা মন্ডলী)

### Data
```prisma
model Advisor {
  id String @id @default(cuid())
  name String; nameBn String?
  degrees String?; designation String; designationBn String?
  organization String?          // hospital / institute they belong to
  bio String? @db.Text
  photo String?
  category String @default("ADVISOR")   // ADVISOR | HONORARY | ACADEMIC_COUNCIL (admin-managed list in settings)
  sortOrder Int @default(0); published Boolean @default(true)
}
```
### Public
- Page `/advisors` titled "উপদেষ্টা মন্ডলী / Advisory Board". Grid of cards: photo (square, rounded), name, degrees, designation, organization. Grouped by category with headings. Click opens a modal with bio.
- Homepage: optional strip "আমাদের উপদেষ্টা মন্ডলী" showing up to 4, toggle in Site Settings `home.showAdvisors`.
- Nav: under About dropdown.
- Admin: CRUD, drag reorder, CSV import (section 3).

---

## 6. Hero section: full-width auto image slider

Replace the current static hero with a full-width slider like the reference screenshot (edge to edge image, text overlay). Keep it tasteful: max 5 slides, no rainbow.

### Data
Reuse `Banner` model, add fields: `subtitleBn/En`, `titleBn/En` (existing title/subtitle become EN), `mobileImage String?`, `ctaLabelBn/En`, `ctaLink`, `cta2LabelBn/En`, `cta2Link`, `overlay Int @default(40)` (0-80, dark overlay percent), `textPosition LEFT|CENTER`, `active`, `sortOrder`, `startAt?`, `endAt?` (schedule).

Site Settings `hero.*`: `autoplay Boolean (true)`, `intervalMs Int (5000)`, `transition FADE|SLIDE (FADE)`, `showDots`, `showArrows`, `pauseOnHover`, `height DESKTOP 520px / MOBILE 360px` editable.

### Behaviour
- Full-bleed section directly under the header. Image `object-cover`, desktop image 1920x700 recommended, mobile image 1080x1080 recommended (falls back to desktop image). `next/image` with `priority` on the first slide only, lazy for the rest.
- Autoplay with interval, pause on hover and on tab hidden, swipe on touch, arrows and dots, keyboard accessible, respects `prefers-reduced-motion` (no autoplay, show first slide with dots).
- Text overlay: title (h1 on first slide, h2 on others), subtitle, up to 2 buttons (default: "Apply Now" accent, "WhatsApp" green). Text on a subtle dark gradient overlay so white text stays readable on any photo.
- Below the slider, keep a thin trust bar: "Govt. approved institute, Code 57125" | "Since 2009" | "Real patient practical" | phone.
- Use `embla-carousel-react` (small, no jQuery). No layout shift: reserve height with CSS before images load.
- If no active banners: fall back to the existing static hero.

### Admin
- Banners page: upload desktop + mobile image (auto-resize, webp), titles BN/EN, buttons, overlay slider, schedule, active toggle, drag reorder, live preview at desktop and mobile widths.

### Seed
Three active banners using existing institute photos (real patient session, classroom, certificate handover) with:
1. "ময়মনসিংহে সর্বপ্রথম সরকার অনুমোদিত আল্ট্রাসাউন্ড ট্রেনিং ইনস্টিটিউট" / "CMU, DMU, ADMU কোর্সে ভর্তি চলছে"
2. "প্রতিটি ক্লাসে রিয়েল পেশেন্টে হাতে-কলমে প্র্যাকটিক্যাল" / "অভিজ্ঞ সোনোলজিস্ট দ্বারা পরিচালিত"
3. "ভর্তির আগে ফ্রি ক্লাসের সুযোগ" / "আজই WhatsApp করুন 01778-838644"

---

## 7. Navigation update
Header nav: Home | About ▾ (About, Chairman's Message, MD's Message, Advisory Board, Faculty, Accreditation) | Courses | Admission | Results | Verify | Notices | Gallery | Contact | [Apply Now]. Mobile: same in drawer. Footer quick links add Results and Verify.

---

## 8. Permissions to add
`certificates.manage`, `results.manage`, `results.publish`, `import.run`, `leadership.manage`, `advisors.manage`, `banners.manage`, `verification.logs.view`.

---

## 9. Acceptance checklist
- /verify finds by certificate no and by BMDC (with dashes/spaces), shows revoked correctly, blocks after rate limit, QR link works.
- /results finds by roll and by registration, shows PASS with GPA and FAIL with subject chips, lists board notice PDFs.
- Templates download as xlsx and csv; a 500-row student file imports in under 10 seconds with correct created/updated/skipped counts and an error CSV.
- Chairman and MD pages render only when published; homepage cards appear.
- Advisors page grouped by category, modal bio works.
- Hero slides autoplay, swipe on mobile, no layout shift (CLS < 0.05), first slide LCP under 2.5 s on 4G.
- All new text bilingual, light theme, no dark mode.

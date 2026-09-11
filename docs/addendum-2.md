# Addendum 2: Selected Advanced Features (Phase 1 additions + Phase 2 modules)

**For the AI building MUTI. Read `muti-website-build-spec.md` and `muti-erp-addendum.md` first. This file adds specific features. Section A goes into the CURRENT build. Section B is Phase 2, build only when told "start Phase 2". Section C is future, do not build, only keep the API shape compatible.**

---

## A. Add to the current build (Phase 1)

### A1. Live batch seat counter
- `Batch` gets `seats Int?`, `seatsFilled Int @default(0)`, `showSeatCounter Boolean @default(true)`.
- Public display: `seatsLeft = seats - seatsFilled`. Shown on home "next batch" block, course detail header, and courses grid card.
  - BN: "সিট বাকি {n}টি" (Bangla digits). EN: "{n} seats left".
  - If `seatsLeft <= 5` render in red with "দ্রুত ভর্তি হোন". If `<= 0` show "সিট পূর্ণ, পরবর্তী ব্যাচের জন্য যোগাযোগ করুন" and change Apply button to "Join waitlist" (Application with `message` prefixed `[WAITLIST]`).
- Admin: `seatsFilled` is editable manually, and auto-increments when an Application is admitted into that batch or a Student is created in that batch. Manual override always wins (store `seatsFilledManual Boolean`).
- Cache the public value for 60 seconds (Next `revalidateTag('batches')`, revalidate on admin save).

### A2. Batch clone
- Admin Batches list: row action "Clone". Dialog: new name, start date, seats. Creates a new Batch with `status UPCOMING`, copies `classDays`, `classTime`, `seats`, `note`, and all `ClassSession` rows (Phase 2) or, in Phase 1, copies nothing else since routine lives on Course. Log to ActivityLog.

### A3. Lead source tracking (needed for Phase 2 reports)
- Application gets `source String?` (FACEBOOK, GOOGLE, REFERRAL, WALK_IN, WEBSITE, OTHER) and `utm Json?`.
- Public forms: read `utm_source`, `utm_campaign`, `fbclid`, `gclid` from URL, store in a cookie for 30 days, attach on submit. Map: fbclid or utm_source=facebook -> FACEBOOK, gclid or utm_source=google -> GOOGLE, `ref=` param -> REFERRAL (store code in `referralCode`), otherwise WEBSITE.
- Admin can set source manually (WALK_IN when office creates an application).

---

## B. Phase 2 modules (build in this order)

### B1. Attendance (prerequisite for dropout alert, portal, teacher payments)
Tables:
```prisma
model ClassSession { id, batchId, courseRoutineId?, date DateTime, startTime String?, topic String, type LECTURE|PRACTICAL|EXAM, teacherId String?, teacher Faculty?, status PLANNED|DONE|CANCELLED, note?, createdAt }
model Attendance { id, sessionId, studentId, status PRESENT|ABSENT|LATE|EXCUSED, markedBy, markedAt  @@unique([sessionId, studentId]) }
```
- Admin: Batch > Sessions tab. "Generate sessions from course routine" button creates one ClassSession per CourseRoutine row with dates auto-spaced by `classDays` starting at `startDate`. Editable after.
- Mark attendance page: session -> list of batch students with tap toggles, default PRESENT, save. Works on phone.
- Student attendance % = PRESENT+LATE / DONE sessions. Shown in Students list and portal.
- Faculty links to User via `Faculty.userId String? @unique` so teachers can log in with TEACHER role and mark attendance for their own sessions only.

### B2. Fees, installments, payments (prerequisite for dues, portal payment, revenue reports)
```prisma
model FeePlan { id, studentId @unique, courseFee Int, otherFees Int, discount Int @default(0), discountReason?, total Int, createdAt }
model Installment { id, feePlanId, seq Int, label String, dueDate DateTime, amount Int, paidAmount Int @default(0), status DUE|PARTIAL|PAID|OVERDUE }
model Payment { id, receiptNo @unique, studentId, installmentId?, amount Int, method CASH|BKASH|NAGAD|BANK|ONLINE, reference?, receivedById, paidAt DateTime, note?, voidedAt?, voidReason? }
```
- On Admit: FeePlan created from Course fees, 50% installment due today, remaining split into N monthly installments (N = admin input, default `durationMonths - 1`, due on the 1st, overdue after the 7th). Admin can edit any installment.
- Record payment dialog: amount auto-fills next due, method, reference. Generates receipt PDF (renderPdf) with receiptNo from Counter, sends SMS/email via `notify('PAYMENT_RECEIPT')`.
- Nightly job: mark DUE installments with `dueDate + 7 days < now` as OVERDUE, queue `INSTALLMENT_OVERDUE` notification. On the 1st: queue `INSTALLMENT_DUE` reminders.
- Online payment: SSLCommerz (covers bKash, Nagad, cards) hosted checkout. Route `/api/v1/payments/sslcommerz/{init,success,fail,ipn}`. Verify IPN server-side before creating Payment with method ONLINE. Config in Site Settings `payments.*`. Keep a `PaymentGateway` interface so bKash direct can be added later.

### B3. Exams and results (upgrade of existing Result)
```prisma
model Exam { id, batchId, name, date, fullMarks Int, passMarks Int, published Boolean }
model Mark { id, examId, studentId, marks Int?, grade?, remark?  @@unique([examId, studentId]) }
```
- Marks entry grid per exam. Grade rule in Site Settings (`results.gradeScale` JSON). Publish -> creates/updates public `Result` entry and queues `RESULT_PUBLISHED` notification to batch students. Result sheet PDF.

### B4. Certificates with QR, verify, revoke, reprint log
```prisma
model Certificate { id, certificateNo @unique, studentId, examId?, type COURSE|SEMESTER, issuedAt, issuedById, fileId, revokedAt?, revokedReason?, verifyToken String @unique }
model CertificatePrint { id, certificateId, printedById, printedAt, reason }
```
- Eligibility check before issue: status COMPLETED or final exam passed, dues = 0 (override with permission `certificates.override`).
- Certificate PDF template (A4 landscape, admin-uploadable background image, positions configurable in Site Settings `certificate.layout`), fields: name, roll, course, batch, dates, certificateNo, QR pointing to `/verify?t={verifyToken}`.
- Public `/verify`: by certificateNo, roll, or QR token. Shows name (partly masked unless opened via QR token), course, batch, issue date, status VALID / REVOKED. Revoked shows reason. Rate limit 20/min/IP.
- Reprint button logs to CertificatePrint with reason.

### B5. ID cards
- Student ID card PDF: front (photo, name, roll, course, batch, validity = batch end date + 3 months, QR to verify), back (institute address, phones, rules line). Size CR80 (85.6 x 54 mm).
- "Print sheet" action: select students (batch filter) -> A4 PDF with 8 cards per page (2 columns x 4 rows), crop marks. Uses renderPdf.
- Card background/design admin-uploadable like certificate.

### B6. Dropout alert
- Nightly job: for each ACTIVE student, if no PRESENT/LATE in the last 14 days AND the batch had at least 2 DONE sessions in that window -> create `Alert(type DROPOUT_RISK, studentId, batchId)` if none open.
```prisma
model Alert { id, type DROPOUT_RISK|OVERDUE_FEES|DOCS_MISSING, studentId?, batchId?, message, status OPEN|RESOLVED, resolvedById?, resolvedAt?, createdAt }
```
- Dashboard "Alerts" card + Alerts page. Resolve with note. Optional one-click "Send check-in SMS" template `CHECK_IN`.
- Same job creates OVERDUE_FEES alert when installment overdue > 15 days.

### B7. Teacher-wise class count and payment due
```prisma
model TeacherRate { id, facultyId, courseId?, type LECTURE|PRACTICAL, ratePerClass Int, effectiveFrom }
model TeacherPayment { id, facultyId, periodFrom, periodTo, sessionsCount Int, amount Int, paidAt?, method?, reference?, note?, ledgerEntryId? }
```
- Report: per teacher, DONE sessions this month grouped by type, x rate = due. "Generate payment" creates TeacherPayment and a LedgerEntry OUT (category TEACHER_PAYMENT). Unpaid balance shown on dashboard.

### B8. Reports and owner dashboard
Dashboard (SUPER_ADMIN, ACCOUNTS):
- Revenue vs due: this month collected (sum Payment), total outstanding (sum Installment.amount - paidAmount for DUE/PARTIAL/OVERDUE), collection rate = collected / (collected + overdue) for the month
- Admissions per month (12-month bar chart), by course
- Leads by source (pie): Applications grouped by `source`, plus conversion rate per source (ADMITTED / total)
- Batch-wise: seats, filled, attendance avg, dues
- Open alerts count, teacher payment due
- All charts filterable by date range and branch. Export CSV per report.
Reports page: Collections (by day/method/receiver), Outstanding dues (aging 0-30/31-60/60+), Admissions, Lead sources, Attendance summary, Teacher classes.

### B9. Weekly summary to owner
- Job every Saturday 09:00 Asia/Dhaka: builds summary (new leads by source, admissions, collected, overdue total, seats left per upcoming batch, open alerts, top 3 overdue students) and sends via `notify('WEEKLY_OWNER_SUMMARY')` to owner email and WhatsApp/SMS number set in Site Settings `reports.ownerRecipients`. Template editable. Also "Send now" button on dashboard.

### B10. SMS provider
- `SmsProvider` interface with drivers: `ConsoleDriver` (dev), `GenericHttpDriver` (configurable URL, params, API key; most BD bulk SMS gateways are simple GET/POST). Config in Site Settings `sms.*`. Unicode Bangla supported. Log provider response in Notification.

### B11. Job board
```prisma
model Job { id, slug @unique, title, organization, location, type FULL_TIME|PART_TIME|CONTRACT, salary?, descriptionBn, descriptionEn?, contact, applyUrl?, deadline?, published, featured, postedById, createdAt }
```
- Public `/jobs` and `/jobs/[slug]`, list with deadline badge, WhatsApp share button. Admin CRUD. Optional "Only for MUTI graduates" flag that hides contact unless logged into portal as COMPLETED student. Auto-unpublish after deadline.

### B12. Student portal (PWA) `/portal`
- Login: phone + OTP via SMS (Otp table: phone, code hash, expiresAt, attempts). Session cookie separate from admin auth.
- Pages: Home (next class, dues summary, latest notice), Routine (ClassSessions of my batch, calendar view), Attendance (% and per-session list), Fees (installments, pay online button -> B2 gateway, receipts download), Results (my marks and grades, result sheet PDF), Certificates (download if issued, verify link), Notices (batch-targeted + global), Profile (photo upload, contact update request), Jobs.
- Notice gets `batchId?` for batch-specific notices; portal shows global + own batch.
- PWA: manifest, service worker (offline shell + cached routine), install prompt, push notifications via Web Push (VAPID keys in env) for class reminder and result published. Push is best effort; SMS remains primary.
- Mobile-first, Bangla default, large tap targets.

### B13. Permissions to add
`attendance.mark`, `attendance.view`, `fees.view`, `fees.collect`, `fees.edit`, `payments.void`, `exams.manage`, `results.publish`, `certificates.issue`, `certificates.revoke`, `certificates.override`, `idcards.print`, `reports.view`, `teachers.pay`, `jobs.manage`, `alerts.manage`, `portal.impersonate` (support only, logged).

### B14. Phase 2 delivery order
1. B1 Attendance
2. B2 Fees/payments (cash first, online gateway last)
3. B3 Exams/results
4. B4 Certificates + verify
5. B5 ID cards
6. B10 SMS driver, then B6 Alerts, B9 Weekly summary
7. B7 Teacher payments
8. B8 Reports dashboard
9. B11 Job board
10. B12 Student portal + PWA

---

## C. Future (do not build): Mobile app
- React Native / Expo app for students and teachers, reusing the same backend.
- To stay compatible NOW: every portal feature in B12 must be implemented as server actions plus mirrored JSON endpoints under `/api/v1/portal/*` with bearer token auth (same OTP flow issuing a JWT), zod-validated, documented in `docs/api.md`. Teacher attendance marking likewise under `/api/v1/teacher/*`. No feature may exist only inside a React server component.

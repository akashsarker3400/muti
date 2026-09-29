# Addendum: Future-proofing for the MUTI Management System (ERP)

**Give this file to the AI that is currently building from `muti-website-build-spec.md`. It changes nothing in the public site scope. It adds constraints so the same codebase can later grow into a full institute management system without a rewrite.**

---

## 1. Architecture decision

Build ONE application, not two.

- The website and the admin panel stay in the same Next.js + PostgreSQL project.
- The future management system (results, admission, ID cards, certificates, SMS, email, attendance, fees, invoices, accounting) is built as new modules inside `/admin` of this same app, on the same database.
- Reason: one login, one database, one deployment, no data sync between systems, and the public site (verify page, results page, notices) reads the same tables the office writes to.
- Only split later if load requires it (it will not for an institute of this size).

Structure the code as feature modules from day one so adding modules is mechanical:

```
src/
  modules/
    courses/      (schema, actions, admin UI, public UI)
    admissions/
    notices/
    students/
    ...
  lib/            (db, auth, rbac, money, dates, sms, email, pdf, storage)
  app/            (routes only, thin, importing from modules)
```

Each module owns: `schema.prisma` fragment (merge via prisma multi-file schema), `actions.ts` (server actions with zod), `admin/` pages, `public/` components, `permissions.ts`.

---

## 2. Conventions to apply NOW (cheap now, expensive later)

1. **IDs:** cuid for all tables. Never expose autoincrement ints publicly.
2. **Money:** store as `Int` in full Taka (no paisa needed in BD fees) in a column named `amount` or `*Fee`. Never Float. Currency is always BDT; no currency column.
3. **Timezone:** all DateTime stored UTC, always rendered in `Asia/Dhaka`. One helper `formatDate(date, locale)`.
4. **Soft delete:** add `deletedAt DateTime?` to Student, Application, Batch, Course, Invoice-type tables. Default queries filter it out.
5. **Audit:** keep `ActivityLog` and write to it from every server action via a single `audit()` helper (userId, action, entity, entityId, diff JSON).
6. **RBAC:** replace the two-value Role enum with a permission model now:
   ```prisma
   model Role { id String @id; name String @unique; permissions String[] }   // e.g. "students.read", "fees.collect", "results.publish"
   model User { ... roleId String; role Role @relation(...) }
   ```
   Seed roles: SUPER_ADMIN (all), OFFICE (applications, students, fees, notices), TEACHER (attendance, results), ACCOUNTS (fees, invoices, accounting). Check permissions with `can(user, "fees.collect")` in every action.
7. **Sequences:** a `Counter` table (`key`, `value`) for human-readable numbers: roll numbers, invoice numbers, receipt numbers, certificate numbers. Format examples: roll `MUTI-2026-CMU-001`, invoice `INV-2026-00042`, certificate `MUTI-C-2026-0117`. Generate inside a transaction.
8. **Students are the core entity.** Everything future (fees, attendance, results, ID card, certificate) hangs off `Student`. Make `Student` now have: `studentId` (public roll), `name`, `nameBn`, `phone`, `email`, `photo`, `fatherName`, `motherName`, `dob`, `gender`, `bloodGroup`, `nid`, `bmdc`, `address`, `courseId`, `batchId`, `admissionDate`, `status`, `applicationId?` (link back to the web application that became this student), `deletedAt`.
9. **Application to Student conversion:** an "Admit" button on an Application creates the Student, assigns roll from Counter, copies fields. Build this button now (it is small).
10. **Files:** one `Media` table (`id, url, mime, size, uploadedBy, entity, entityId`) and a `storage.ts` abstraction (`put`, `get`, `delete`) with a local-disk driver now. Later S3/R2 driver drops in.
11. **Notifications:** create the tables now, even if only email is wired:
    ```prisma
    model Notification { id, channel (SMS|EMAIL|WHATSAPP), to, body, templateKey?, status (QUEUED|SENT|FAILED), providerId?, error?, studentId?, createdAt, sentAt }
    model Template { key @unique, channel, subjectBn?, subjectEn?, bodyBn, bodyEn }   // placeholders {{name}}, {{amount}}, {{dueDate}}
    ```
    A `notify(channel, to, templateKey, vars)` helper writes a row; a worker sends. Email provider now, SMS provider later (any BD bulk SMS API), WhatsApp later.
12. **Settings:** keep `SiteSetting` JSON but namespace keys (`site.*`, `fees.*`, `sms.*`, `invoice.*`) so ERP settings live in the same place.
13. **PDF generation:** add `@react-pdf/renderer` (or Puppeteer) behind one `renderPdf(templateName, data)` helper now, used first for the admission form printout. Later reused for invoices, receipts, ID cards, certificates, result sheets.
14. **Background jobs:** a `Job` table + a route `/api/cron/run` called by Coolify cron every minute (no Redis). Used for sending notifications, monthly due reminders, backups.
15. **API layer:** all mutations are server actions returning `{ ok, data | error }`. Add `/api/v1/*` route handlers only for external integrations (SMS webhooks, payment gateway callbacks, mobile app later).
16. **Multi-branch ready:** add `branchId String?` to Batch, Student, Invoice-type tables with a `Branch` table seeded with one row "Mymensingh". Costs nothing now; a second campus later is a filter, not a migration.

---

## 3. Future modules (Phase 2+), with the tables they will need

Do not build these now. Ensure nothing in Phase 1 conflicts with them.

| Module | Purpose | Tables |
|---|---|---|
| Admission desk | Walk-in admission, document checklist, admit from application, print admission form | Student, StudentDocument (type, fileId, verified) |
| Fees & installments | Fee structure per course/batch, per-student payment plan, due tracking, partial payments, discounts | FeePlan (studentId, totalFee, discount, discountReason), Installment (feePlanId, seq, dueDate, amount, paidAmount, status), Payment (studentId, installmentId?, amount, method CASH/BKASH/NAGAD/BANK, reference, receivedBy, receiptNo, date) |
| Invoices & receipts | PDF receipt on every payment, monthly statement, SMS receipt | Invoice (invoiceNo, studentId, items JSON, total, paid, status), uses Payment |
| Accounting (light) | Income/expense ledger, categories, daily cash book, monthly P&L, teacher payments | Account, LedgerEntry (date, type IN/OUT, category, amount, method, refType, refId, note), Expense category seed |
| Attendance | Per class session, per student, QR or manual, percentage report, eligibility for exam (e.g. 75% rule) | ClassSession (batchId, date, topic, teacherId), Attendance (sessionId, studentId, status PRESENT/ABSENT/LATE) |
| Exams & results | Exam definition, marks entry per student, grade calc, publish to /results, result sheet PDF | Exam (batchId, name, date, fullMarks, passMarks), Mark (examId, studentId, marks, grade), Result already exists (make it reference Exam) |
| Certificates | Generate certificate PDF from template with QR to /verify, certificate register, reprint log | Certificate (certificateNo, studentId, examId?, issuedAt, fileId, revoked) |
| ID cards | Student ID card PDF (photo, roll, batch, validity, QR) | uses Student, Media |
| Communication | SMS/email/WhatsApp campaigns, templates, installment due reminders (auto on 1st), class reminders, result published alerts | Notification, Template, Campaign (audience filter, channel, templateKey, scheduledAt) |
| Teachers | Faculty as users, assigned batches, class schedule, payment per class | Teacher links to User + Faculty, TeacherPayment |
| Timetable | Batch class schedule calendar, room, teacher | ClassSession already covers this |
| Inventory (optional) | Ultrasound machines, probes, books stock, book sales to students | Asset, StockItem, StockMovement |
| Reports | Admissions per month, collection vs due, batch-wise revenue, dropouts, attendance | queries over the above; export CSV/PDF |
| Student portal / app | Login by phone OTP, view routine, dues, pay via bKash, results, certificate download | Otp table, reuse everything |

---

## 4. What to add to the CURRENT build (small list)

Add these to the Phase 1 scope now:

1. Permission-based RBAC (section 2.6) instead of the two-role enum.
2. `Counter` table + roll number generation.
3. Expanded `Student` fields (section 2.8) and "Admit" button on Application.
4. `Media` table + `storage.ts` abstraction.
5. `Notification` + `Template` tables, `notify()` helper, email driver only.
6. `Branch` table + `branchId` on Batch and Student.
7. `deletedAt` soft delete on Course, Batch, Student, Application.
8. `audit()` helper used in all server actions.
9. `renderPdf()` helper with one template: admission form printout.
10. `/api/cron/run` route + `Job` table (empty worker is fine).
11. Module folder structure (section 1).

Everything else in this addendum is Phase 2 and must not be built now.

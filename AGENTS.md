# MUTI website — notes for agents and developers

Official website plus admin panel for **Mymensingh Ultrasound Training
Institute (MUTI)**. The specifications are kept in `docs/build-spec.md`,
`docs/addendum-2.md`, `docs/addendum-3.md`, `docs/addendum-4.md`,
`docs/addendum-5.md` and `docs/homepage-additions.md`; section numbers in code comments refer to them
("section 5.4" is the build spec, "addendum 2, A1" the addendum).
`HANDOVER.md` records every outstanding TODO and every deliberate deviation.

Addendum 2 section B (Phase 2) is **being built**, in the order B14 sets out;
`HANDOVER.md` section 6 tracks what is done. Section C (the mobile app) is not
built: what it asks of us is that every portal feature also exists as a JSON
endpoint under `/api/v1/portal/*`, never only inside a server component.
`docs/erp-addendum.md` is the future-proofing brief: its section 4 is Phase 1
and is built (see below); everything else in it is Phase 2 and must not be.

## Stack

- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS v4 + shadcn/ui (radix base), **light theme only — no dark mode**
- PostgreSQL 16 + Prisma 7 (driver adapter `@prisma/adapter-pg`, no Rust engine)
- Auth.js v5 (credentials, bcrypt cost 12, JWT sessions) for `/admin`
- `next-intl` — English (`en`, default, no URL prefix) and Bangla (`/bn/...`);
  old `/en/*` URLs redirect permanently to the root

## Layout of the app router

Two root layouts live side by side in route groups, because the public site is
locale-prefixed and the admin panel is not:

- `src/app/(site)/[locale]/…` — public pages, `dynamic = "force-dynamic"`
- `src/app/(admin)/admin/…` — admin panel
- `src/app/api/…`, `src/app/uploads/…` — route handlers (no layout)

Public pages render per request because the Docker image is built without
database access, so nothing can be prerendered at build time.

## Prisma 7 specifics

- The connection string lives in `prisma.config.ts`, **not** in
  `schema.prisma` (Prisma 7 removed `datasource.url`).
- The client is generated into `src/generated/prisma` and is gitignored; run
  `npm run db:generate` after pulling schema changes.
- `prisma/seed.ts` is bundled to `prisma/seed.mjs` by `scripts/build-seed.mjs`
  for the production image.

## Conventions

- Bilingual DB columns are `…Bn` / `…En`. English is required and Bangla is
  optional; read them through `pick()` in `src/lib/format.ts`, which falls back
  to English when Bangla is empty. `/admin/needs-english` lists records whose
  English column still holds the Bangla placeholder from the migration.
- Money and dates always go through `formatMoney` / `formatDate`: Latin digits
  in English (and everywhere in the admin), Bangla digits on `/bn`.
- The admin panel UI is English only. Bangla appears there only inside content
  the office typed, wrapped in `lang="bn"` (use `langOf()` from `src/lib/lang.ts`).
- Page metadata uses `pageAlternates(locale, path)` from `src/i18n/routing.ts`
  for canonical + hreflang (x-default = English).
- Fonts: Inter everywhere; SolaimanLipi for Bangla, self-hosted from src/fonts, Bengali unicode-range only (Noto Sans Bengali as glyph fallback)
  only under `html[lang="bn"]` and `[lang="bn"]` (see `src/lib/fonts.ts` and the
  Bangla block in `globals.css`).
- One portrait style for people: `PersonPortrait` (4:5 box, never a circle) is
  used by faculty, leadership and advisors.
- Never hardcode the WhatsApp number — build links with `waLink()` and the
  number from Site Settings.
- Content marked `TODO` in the spec is seeded as a clear placeholder and
  listed in `HANDOVER.md`. Do not invent facts, fees or dates.
- Batch reads are cached for 60 seconds under the `batches` tag because they
  carry the live seat counter. Any write that touches a batch must call
  `revalidateBatches()` from `src/lib/admin/seats.ts`.
- `Batch.seatsFilledManual` means the office typed the number themselves;
  automatic seat counting must leave that batch alone.
- Soft delete (ERP addendum, 2.4) covers Course, Batch, Student and
  Application. The filter lives in the Prisma client extension in
  `src/lib/prisma.ts`, not at the call sites, so it cannot be forgotten;
  `findUnique` becomes `findFirst` there. Spread `includingDeleted` into a
  `where` to look past it on purpose — needed whenever uniqueness is checked,
  because a deleted student still owns their roll. A nested relation read is
  **not** covered: filter those by hand.
- Roll numbers come from `src/lib/roll-number.ts` (`MUTI-2026-CMU-001`) through
  the same atomic `Counter` the certificate series uses. The "Admit" button on
  an application (`admitApplication`) copies the applicant into a Student,
  takes the next roll, and links the two by `Student.applicationId`; pressing
  it twice opens the existing record instead of making a second one.
- `Branch` exists with one row and a nullable `branchId` on Batch and Student
  (ERP addendum, 2.16). Nothing filters on it yet; a second campus later is a
  filter rather than a migration.
- Scheduled work has one entry point, `/api/cron/run`, which runs every job and
  catches each separately. The single-purpose cron routes still exist for
  anyone who wants a different schedule for one of them.
- Attendance (addendum 2, B1): `ClassSession` per class, `Attendance` per
  student per class, with an absent row written too — "marked absent" and
  "nobody took the register" are different answers. A percentage counts
  present and late as attended, leaves excused out of the total, and only
  looks at sessions marked DONE. A `TEACHER` account sees only
  `/admin/my-classes` and may mark only sessions whose `Faculty.userId` is
  theirs; the office may mark anybody's.
- Money is whole Taka in an `Int`, never a float: `src/lib/fees-math.ts` holds
  the arithmetic (and is unit tested without a database), `src/lib/fees.ts` the
  database side. An instalment's `paidAmount` is always **re-read** from its
  own receipts by `restateInstallment`, never incremented, so the two cannot
  drift. A payment is voided with a reason, never deleted: a receipt that was
  handed over is a fact. Receipt numbers come from the same atomic `Counter`.
- Marks: the grade is computed from the mark (`src/lib/grades.ts`), never
  typed, because a grade and a mark that disagree is the mistake nobody spots
  until a student brings the sheet back. A blank mark means "did not sit" and
  stays null all the way to the database; it is not a zero.
- The student portal (`/portal`) has its **own** session (`PortalSession`, the
  `muti_portal` cookie) and its own root layout, and is excluded from the
  locale middleware. A student must never end up holding anything the office
  holds. Codes and session tokens are stored hashed. An unknown phone number
  gets the same answer as a known one, or the login page becomes a way to
  discover who the students are. Everything the portal reads is also
  `/api/v1/portal`, which is what section C asks for.
- Phone numbers are stored normalised (`+8801…`). Look one up with
  `phoneVariants()`, because rows saved before that change kept the local form.
- `logActivity(user, action, entity, id, detail?)`: pass `detail` as
  `{ field: { from, to } }` for a correction worth tracing back (application
  edits do; the edit page lists them).
- Named permissions live in `src/lib/permissions.ts`; guard a page or action
  with `requirePermission("…")`. A resource in `src/lib/admin/resources.ts`
  declares its own `permission` and the generic pages enforce it.
- Public lookups (`/verify`, `/results`) must go through `checkRateLimit`,
  `verifyTurnstile` and write a `VerificationLog` row — see
  `src/app/actions/verify.ts` for the shape.
- Bulk imports are defined once in `src/lib/admin/import/entities.ts`
  (columns, templates, header matching) with the database side in
  `src/app/actions/admin-import.ts`. Add a new importable entity in both.
- Health appointments are health data (addendum 4 §5): never render a
  patient's name or phone on a public page, and keep `anonymizeOldAppointments`
  in the path of anything that lists them.
- Email goes through Brevo (`BREVO_API_KEY`) with SMTP as fallback and the log
  as the last resort; `sendMail()` in `src/lib/mail.ts` is still the only entry
  point. A failed send must never fail a visitor's submission.
- Admin 2FA is TOTP (`src/lib/totp.ts`, unit tested). The secret is encrypted
  at rest with a key derived from `AUTH_SECRET`. Auth.js needs a
  `CredentialsSignin` **subclass** per outcome, because the constructor
  argument is the message, not the `code` the client reads.
- Visitor counting is ours: `<VisitorBeacon>` posts to `/api/v1/hit` and
  `src/lib/visitors.ts` stores a path, a day and a daily-rotating hash. Never
  store an address or set a cookie there, and keep `/admin` out of the counts.
- The nightly `pg_dump` lives in `src/lib/backup.ts`; `DATABASE_URL` must go
  through `pgDumpUrl()` first, because libpq rejects Prisma's `?schema=`.
  Backups are super admin only and readable only through `/api/admin/backup`.
- Security headers live in `next.config.ts`; add a new embed origin to the CSP
  there or the iframe will silently fail.
- `ADMIN_HOST` (optional) serves the admin panel from its own hostname; the
  routing rules live in `src/lib/admin-host.ts` and are unit tested. Links from
  the admin to the public site must be absolute (`siteUrl`), not `/`.
- Printed documents build their QR from `siteUrl`, never the request host, and
  the certificate QR uses `/verify?t=<verifyToken>` (the only parameter that
  page reads).
- The admit card lives at `/admin/board-exams/<id>/admit-cards`, one A4 page
  per candidate of `BoardExam.batch`. It is a printed document, not the Phase 2
  exam module: nothing here does marks, grades or attendance.
- The certificate, the registration card and the admit card are **English
  only**; a student's own name is the one exception. The ornamental frame is a
  positioned `<span>` with an SVG at `size-full` inside it — set the insets on
  the SVG itself and it renders square. A signature slot with nothing in it
  still prints its line.
- A certificate is a draft until it is approved: `certificates.manage` prepares
  (bulk issue at `/admin/certificates/issue`), `certificates.issue` approves on
  `/admin/certificates/register`, and the print page refuses an unapproved one.
  Every print writes a `CertificatePrint` row; handovers live on the same
  register. Editing an approved, undelivered certificate clears its approval
  (`beforeWrite` on the certificates resource).
- SMS and WhatsApp go through `sendTemplate`/`sendMessage` in
  `src/lib/messaging.ts`, never a gateway directly. Every attempt writes a
  `MessageLog` row; anything automatic passes a `dedupeKey` (the column is
  unique, which is what makes the daily job idempotent). Template wording
  lives in `MessageTemplate`, with the built-in set in
  `src/lib/messaging-defaults.ts` (kept separate so `prisma/seed.ts` can
  import it without pulling in server-only code). A health message must never
  carry the complaint, the age or a pregnancy field.
- Uploads: `isPublicKey` (public `/uploads` route) vs `isSafeKey` (storage).
  Anything under `protected/` is only reachable through a signed route
  (`/api/v1/book/sample`). Videos, posters and protected files have a `Media`
  row; ordinary images and PDFs do not.
- A blog post with `needsReview` cannot be published: the rule is the
  `validate` hook on the blog resource, enforced in `saveResource`. The
  reviewer's name and date are typed (`Post.reviewedBy`/`reviewedAt`) and are
  rendered both as a byline and as `reviewedBy`/`lastReviewed` in the
  BlogPosting JSON-LD.
- Addendum 5 part B is built: the portal reader, the question bank and the
  case-image schema. Two rules hold throughout. Nothing is generated — not a
  chapter, not a question — because the book is the institute's own work and a
  wrong answer in an ultrasound question is a clinical error. And nothing
  reaches a student until a doctor is recorded as having reviewed it; editing
  takes that review off again. The portal reader is not gated on the book's
  `published` flag, which governs the public marketing page instead.

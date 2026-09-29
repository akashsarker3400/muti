# MUTI website — notes for agents and developers

Official website plus admin panel for **Mymensingh Ultrasound Training
Institute (MUTI)**. The specifications are kept in `docs/build-spec.md`,
`docs/addendum-2.md`, `docs/addendum-3.md`, `docs/addendum-4.md`,
`docs/addendum-5.md` and `docs/homepage-additions.md`; section numbers in code comments refer to them
("section 5.4" is the build spec, "addendum 2, A1" the addendum).
`HANDOVER.md` records every outstanding TODO and every deliberate deviation.

Addendum 2 section B (Phase 2: attendance, fees, exams, certificates, portal…)
is **not** built and must not be started until the owner says "start Phase 2".
It also depends on `muti-erp-addendum.md`, which has not been supplied yet.

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
- Fonts: Inter everywhere; Hind Siliguri (Noto Sans Bengali as glyph fallback)
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
- Addendum 5 part B (portal reader, MCQ bank, case images) is Phase 2: not
  built, schema left compatible.

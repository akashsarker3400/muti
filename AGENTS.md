# MUTI website — notes for agents and developers

Official website plus admin panel for **Mymensingh Ultrasound Training
Institute (MUTI)**. The specifications are kept in `docs/build-spec.md`,
`docs/addendum-2.md` and `docs/addendum-3.md`; section numbers in code comments refer to them
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
- `next-intl` — Bangla (`bn`, default, no URL prefix) and English (`/en/...`)

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

- Bilingual DB columns are `…Bn` / `…En`; read them through `pick()` in
  `src/lib/format.ts`, which falls back to Bangla when English is empty.
- Money and dates always go through `formatMoney` / `formatDate` so Bangla
  digits are used in the Bangla UI.
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

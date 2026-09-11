# MUTI website — notes for agents and developers

Official website plus admin panel for **Mymensingh Ultrasound Training
Institute (MUTI)**. The full specification is kept in `docs/build-spec.md`;
the section numbers in code comments refer to it. `HANDOVER.md` records every
outstanding TODO and every deliberate deviation from that spec.

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

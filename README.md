# MUTI — Mymensingh Ultrasound Training Institute

Official website and admin panel for **Mymensingh Ultrasound Training
Institute (MUTI)** — a government approved ultrasound training institute in
Mymensingh, Bangladesh (institute code 57125, established 2009).

Bangla-first, mobile-first, light theme only. Built so office staff can run the
whole site from `/admin` without touching code.

---

## Stack

| Layer      | Choice                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router), TypeScript strict                                  |
| Styling    | Tailwind CSS v4 + shadcn/ui (radix base), **light theme only**              |
| Database   | PostgreSQL 16                                                               |
| ORM        | Prisma 7 (driver adapter `@prisma/adapter-pg`, no Rust engine)              |
| Admin auth | Auth.js v5 — credentials, bcrypt cost 12, 12-hour JWT sessions              |
| i18n       | `next-intl` — `bn` (default, no prefix) and `en` (`/en/…`)                  |
| Uploads    | Local volume `/app/uploads`, `sharp` → webp, served by `/uploads/[...path]` |
| Email      | Nodemailer over SMTP (optional — submissions never depend on it)            |
| Rich text  | Tiptap, stores HTML, sanitised on the way out                               |
| Deployment | Multi-stage Dockerfile (`output: "standalone"`) on Coolify                  |

---

## Getting started

```bash
# 1. Postgres 16 must be running and a database must exist.
#    macOS:  brew install postgresql@16 && brew services start postgresql@16
#    Docker: docker compose up -d postgres

# 2. Environment
cp .env.example .env          # then fill in AUTH_SECRET, ADMIN_PASSWORD, …
openssl rand -base64 32       # a good AUTH_SECRET

# 3. Install, migrate, seed
npm install
npm run db:migrate            # creates the schema
npm run db:seed               # admin user, 7 courses, routines, notices, FAQ…

# 4. Run
npm run dev                   # http://localhost:3000  ·  /admin for the panel
```

The seed creates the first SUPER_ADMIN from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Change that password after the first login.

### Everyday commands

| Command                            | What it does                                     |
| ---------------------------------- | ------------------------------------------------ |
| `npm run dev`                      | Development server                               |
| `npm run build` / `npm start`      | Production build and server                      |
| `npm run typecheck`                | TypeScript, no emit                              |
| `npm run lint`                     | ESLint (zero warnings allowed)                   |
| `npm run format`                   | Prettier, including Tailwind class sorting       |
| `npm test`                         | Vitest unit tests                                |
| `npm run test:e2e`                 | Playwright smoke tests (needs a seeded database) |
| `npm run db:migrate` / `db:deploy` | Create / apply migrations                        |
| `npm run db:seed`                  | Seed (safe to re-run)                            |
| `npm run db:studio`                | Prisma Studio                                    |
| `npm run db:reset`                 | **Destructive** — drop, migrate and re-seed      |

---

## How the project is laid out

```
src/
  app/
    (site)/[locale]/…      public pages   (dynamic, locale-prefixed)
    (admin)/admin/…        admin panel    (not locale-prefixed)
    api/…                  health, OG image, upload, CSV export, Auth.js
    uploads/[...path]/     serves the uploads volume
    actions/               server actions (public forms + every admin mutation)
  components/site/         public UI
  components/admin/        admin UI
  lib/                     formatting, phone, queries, sanitising, settings
  lib/admin/               the admin form/resource registry
prisma/                    schema, migrations, seed
tests/unit                 Vitest
tests/e2e                  Playwright
```

Two root layouts live side by side in route groups because the public site is
locale-prefixed and the admin panel is not. Public pages render per request
(`dynamic = "force-dynamic"`): the Docker image is built without database
access, so nothing can be prerendered — and staff edits appear immediately,
with no cache to purge.

### Conventions worth knowing

- Bilingual columns are `…Bn` / `…En`. Read them with `pick()` from
  `src/lib/format.ts`, which falls back to Bangla when English is empty.
- Money and dates always go through `formatMoney` / `formatDate` so the Bangla
  UI gets Bangla digits (`৳ ৩০,৭৫০`) and the English UI gets `Tk 30,750`.
- Never hardcode the WhatsApp number — build links with `waLink()` and the
  number from Site Settings.
- Admin HTML is sanitised by `sanitizeRichText()` before it ever reaches
  `dangerouslySetInnerHTML`. Brand colours are validated as hex before being
  written into a `<style>` tag.
- The logo, favicon, brand colours and six fixed content lists (why choose,
  documents, payment policy, admission steps, values, certificates) are all
  admin-editable. `src/lib/content.ts` is now only the seed source for them.
- Every server action re-checks authentication with `requireAdmin()`. A server
  action is a public endpoint; it can never trust the page that rendered it.

---

## Deployment (Coolify)

1. Create a **PostgreSQL 16** service; note its internal connection string.
2. Create an application from this Git repository (it builds the `Dockerfile`).
3. Set the environment variables from `.env.example`. `NEXT_PUBLIC_SITE_URL`
   must also be passed as a **build argument** — it is inlined at build time.
4. Add a persistent volume mounted at **`/app/uploads`**. Without it, uploaded
   images and PDFs are lost on every redeploy.
5. Health check: `GET /api/health` (it verifies the database too).
6. Put Cloudflare in front for TLS and caching.

**Step-by-step, in Bangla, including DNS, backups and a troubleshooting
table: [`docs/deploy-coolify-bn.md`](docs/deploy-coolify-bn.md).**

Two things are easy to miss and expensive to get wrong: `NEXT_PUBLIC_SITE_URL`
must be ticked as a _build_ variable (it is inlined at build time, so fixing it
later needs a full rebuild), and without the `/app/uploads` volume every
uploaded image is lost on the next deploy.

On start the container runs `prisma migrate deploy`, then the seed — which
only creates content when the `User` table is empty, so a redeploy never
resurrects notices or courses that staff deleted.

### Backups

Add a nightly Coolify cron on the Postgres service:

```bash
pg_dump -Fc "$DATABASE_URL" > /backups/muti-$(date +%F).dump
find /backups -name 'muti-*.dump' -mtime +14 -delete
```

Back up the `/app/uploads` volume on the same schedule — the database stores
paths, not files.

---

## Tests

```bash
npm test                     # 58 unit tests: phone, Bangla digits, fees, CSV,
                             # slugs, HTML sanitising, seat counter, lead source
npm run test:e2e             # 41 smoke tests across desktop and mobile
```

The Playwright suite starts `npm run dev` itself unless `E2E_BASE_URL` is set,
and needs a seeded database. It creates and then removes its own notice and
batch, so it is safe to run repeatedly against a development database — do not
point it at production.

A `setup` project signs in once and shares the session with every other
project; logging in per test would trip the panel's own login rate limit (10
attempts per 15 minutes per IP) part-way through a full run.

Lighthouse (mobile) on the production build: performance 85–95 depending on
the page and the run, accessibility 100, best practices 100, SEO 100.

`./scripts/serve.sh` starts the production server, first freeing port 3000 —
a stale listener silently serves the previous build, which is easy to mistake
for a code change not working.

---

## Staff guide and outstanding content

- **`docs/admin-guide-bn.md`** — how office staff use the admin panel, in Bangla.
- **`HANDOVER.md`** — every piece of content still marked TODO, what it affects,
  and where to enter it.
- **`docs/build-spec.md`** and **`docs/addendum-2.md`** — the specifications this
  was built from. Section numbers in code comments refer to them.

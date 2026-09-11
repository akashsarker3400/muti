# MUTI — handover: content and decisions still needed

The site is complete and working, including **section A of addendum 2** (live
seat counter and waitlist, batch clone, lead source tracking). Everything below
was marked `TODO` in the specifications, or is a judgement call the owner
should confirm. Nothing here blocks launch except the items in **section 1**.

> **Addendum 2 section B (Phase 2)** — attendance, fees and installments,
> exams, certificates with QR, ID cards, alerts, SMS, teacher payments,
> reports, job board and the student portal — is **not** built. It is gated
> behind the owner saying "start Phase 2", and it depends on
> `muti-erp-addendum.md`, which has not been supplied yet (that document
> defines `notify()`, `renderPdf`, `Counter`, `LedgerEntry`, the permission and
> role system, and branches — most of section B is built on them).

Each row says where to enter the value: an admin screen, an environment
variable, or a file in the repository.

---

## 1. Must be done before launch

| #   | What                                    | Where                                                                   | Why it matters                                                                                                           |
| --- | --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1.1 | **Domain name**                         | Buy it, then point Cloudflare at Coolify                                | The spec notes the poster domain "MUTI.Ultrasound.com" is not a valid domain. `mutibd.com` was suggested but not bought. |
| 1.2 | **`AUTH_SECRET`**                       | Coolify env var — `openssl rand -base64 32`                             | Sessions are signed with it. Never reuse the development value.                                                          |
| 1.3 | **`ADMIN_PASSWORD`**                    | Coolify env var, then change it in `/admin/users` after the first login | The seed creates the first SUPER_ADMIN from it.                                                                          |
| 1.4 | **`NEXT_PUBLIC_SITE_URL`**              | Coolify env var **and build argument**                                  | Inlined at build time; it drives canonical URLs, the sitemap and OG images.                                              |
| 1.5 | **Gmail app password**                  | `SMTP_PASS` env var                                                     | Without it applications are still saved, but no notification email is sent.                                              |
| 1.6 | **Persistent volume at `/app/uploads`** | Coolify                                                                 | Without it, every uploaded image and PDF is lost on redeploy.                                                            |
| 1.7 | **Real MUTI logo**                      | Replace `public/logo.svg`                                               | The current file is a placeholder built from the described elements (navy ring, red ring, yellow star).                  |

---

## 2. Content the owner has not supplied

These have clear placeholders in the site today. Nothing was invented.

| #    | What                                                        | Where to enter it                                                   | What the site does meanwhile                                                                                                                                                            |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | **Office hours**                                            | Site Settings → যোগাযোগ                                             | The "অফিস সময়" row is hidden on /contact and in the contact strip.                                                                                                                     |
| 2.2  | **Exact map coordinates**                                   | Site Settings → যোগাযোগ (lat/lng or a full embed URL)               | The map falls back to a Google Maps search for the address string.                                                                                                                      |
| 2.3  | **Number of doctors trained**                               | Site Settings → হোমপেজ (number + the switch)                        | The stat tile stays hidden; the other three tiles fill the strip.                                                                                                                       |
| 2.4  | **Hero photo** (real practical session)                     | Site Settings → হোমপেজ → হিরো ছবি                                   | A branded placeholder panel with an ultrasound-sweep pattern.                                                                                                                           |
| 2.5  | **Real-patient practical photo**                            | Site Settings → হোমপেজ                                              | Same placeholder panel.                                                                                                                                                                 |
| 2.6  | **Class days and times**                                    | Admin → ব্যাচ (per batch), and the FAQ "ক্লাস কোন দিন হয়?"         | The FAQ answer currently says to contact the office.                                                                                                                                    |
| 2.7  | **Batch start dates**                                       | Admin → ব্যাচ                                                       | Three UPCOMING batches are seeded with no date; the site shows "শীঘ্রই শুরু".                                                                                                           |
| 2.8  | **Faculty** — photos, names, degrees, designations, bios    | Admin → শিক্ষকমণ্ডলী                                                | `/faculty` shows "শিক্ষকমণ্ডলীর তথ্য শীঘ্রই যোগ করা হবে", and the homepage faculty section is hidden.                                                                                   |
| 2.9  | **Director's message** — photo, name, degrees, message      | Admin → শিক্ষকমণ্ডলী, with "Director" in the designation            | The About page shows the block only once such an entry exists.                                                                                                                          |
| 2.10 | **Student testimonials**                                    | Admin → অভিমত                                                       | The homepage carousel is hidden while empty.                                                                                                                                            |
| 2.11 | **Gallery photos**                                          | Admin → গ্যালারি                                                    | `/gallery` and the homepage preview are hidden while empty.                                                                                                                             |
| 2.12 | **Partner logos** (BTEB, Ministry, WAUCM, Jonosastho)       | Admin → অনুমোদন ও সহযোগী → লোগো                                     | Name initials in a branded tile. Use official logos only if MUTI is licensed to.                                                                                                        |
| 2.13 | **BTEB approval letter / certificate images**               | Admin → ডাউনলোড or গ্যালারি                                         | The accreditation page shows the code and partner cards only. **Never upload the owner's TIN, NID or trade licence** (spec section 1).                                                  |
| 2.14 | **Downloadable PDFs** — admission form, routine, prospectus | Admin → ডাউনলোড                                                     | `/downloads` shows the empty state; the admission page hides its download block.                                                                                                        |
| 2.15 | **Blog articles**                                           | Admin → ব্লগ                                                        | Two titles from the spec are seeded as **drafts** with a placeholder body: "MBBS এর পর আল্ট্রাসাউন্ড কোর্স কেন করবেন" and "CMU ও DMU কোর্সের পার্থক্য".                                 |
| 2.16 | **Timeline** (2009 established, 2010 BTEB approval, …)      | Not built — the spec marks it optional and the milestones were TODO | The About page has no timeline section.                                                                                                                                                 |
| 2.17 | **Colour Doppler & Anomaly Scan** — fee and duration        | Admin → কোর্স                                                       | Seeded as 0, so the pages show "ফি জানতে যোগাযোগ করুন" and "সময়কাল জানতে অফিসে যোগাযোগ করুন".                                                                                          |
| 2.18 | **ADMU advanced modules**                                   | Admin → কোর্স → ADMU → রুটিন                                        | The routine is a copy of DMU. The advanced modules are not listed anywhere; the ADMU overview tells visitors to contact the office. Add the real rows when the institute provides them. |

---

## 3. Decisions to confirm with the owner

| #   | Question                                                                                         | What the site does now                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | **Which fee figures are published?** The owner's headline totals differ from the admission PDFs. | The PDF figures are seeded (CMU Regular 11,000 + 1,550 + 200 + 850; CMU BTEB 30,750 + 5,350 + 200 + 850; DMU 70,750 + 5,350 + 200 + 850; ADMU 1,00,000; TVS 30,000). The owner's all-inclusive totals — CMU Regular 13,500 · CMU BTEB 37,500 · DMU 80,000 · ADMU 1,00,000 · TVS 30,000 — are shown as help text on the admin Fees tab. |
| 3.2 | **DMU duration** — the owner said 6 months, the PDFs and the BTEB letter say 1 year.             | Seeded as 12 months, per the spec.                                                                                                                                                                                                                                                                                                     |
| 3.3 | **Certificate wording**                                                                          | BTEB courses: "কোর্স শেষে সফলভাবে উত্তীর্ণদের জন্য সরকারি সনদপত্র প্রদান করা হবে।" Others: "কোর্স শেষে প্রতিষ্ঠানের সনদপত্র প্রদান করা হয়।" The spec asks for this to be confirmed.                                                                                                                                                   |
| 3.4 | **Yearly line** — "সাফল্যের ১৬তম বর্ষে পদার্পণ"                                                  | Stored in Site Settings as plain text; it does **not** update itself. Change it each year. The "years of experience" counter is computed from the established year and does update.                                                                                                                                                    |
| 3.5 | **Google Analytics / Meta Pixel**                                                                | No IDs are set, so no tracking script loads at all. Add the IDs in Site Settings → ইন্টিগ্রেশন when the owner wants tracking (and consider whether a cookie notice is then needed).                                                                                                                                                    |

---

## 4. Deliberate deviations from the specification

Each of these is a small, reversible change with a reason.

| #   | Spec said                                                | Built as                                                                                                                               | Why                                                                                                                                             |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | `--whatsapp: #25D366` for WhatsApp buttons               | `#25D366` kept as the brand tint; filled buttons use `#0B8043`                                                                         | White text on `#25D366` is 1.98:1 — far below the AA minimum the same section requires. `#0B8043` reads as WhatsApp green and measures 5.0:1.   |
| 4.2 | Success `#1E8E3E`, warning `#B26A00`                     | Same, plus darker `-ink` variants for text on tinted badges                                                                            | The original values gave 3.6:1 on their own 12% tints. The tokens are unchanged for icons and borders.                                          |
| 4.3 | "Seed runs only if the `User` table is empty"            | The seed always runs; it creates content only when the `User` table is empty, and always ensures the admin user and settings row exist | Same outcome, and a redeploy cannot resurrect content staff deleted.                                                                            |
| 4.4 | Prisma (version unspecified)                             | Prisma 7                                                                                                                               | Current major. The connection string lives in `prisma.config.ts`, not `schema.prisma`, and the client is generated into `src/generated/prisma`. |
| 4.5 | Roll search on `/results`                                | `/results` links to `/verify` for roll lookup                                                                                          | One rate-limited, name-masked lookup instead of two paths to the same data.                                                                     |
| 4.6 | Search on every admin list                               | Search on the list screens; the media library and activity log filter instead                                                          | Those two are file- and time-ordered, where a filter is more useful than a text search.                                                         |
| 4.7 | Seed an "Advanced modules: TODO" row in the ADMU routine | Row omitted                                                                                                                            | That row renders inside the public routine table, where prospective students would read the word TODO. The gap is recorded in row 2.18 instead. |

---

## 5. Known issues

| #   | Issue                                                                                   | Impact                                                                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | `npm audit` reports advisories in `nodemailer`, `postcss` and Prisma's bundled `mysql2` | No patched versions exist yet — `nodemailer` and `postcss` are already at their latest releases. All are build-time or server-side paths we control (we never pass untrusted input to nodemailer's `raw` option, and `mysql2` is unused: the project is PostgreSQL only). Re-run `npm audit` periodically and upgrade when fixes ship. |
| 5.2 | OG images are English-only                                                              | `next/og` needs an embedded font file for Bangla glyphs and no licensed file is in the repo. Course names are English in both languages, so the cards read correctly. To add Bangla, drop a Hind Siliguri `.ttf` into the repo and register it in `src/app/api/og/route.tsx`.                                                          |
| 5.3 | Public pages render on every request                                                    | Deliberate — the Docker image is built without database access, and staff edits must appear immediately. If traffic ever makes this a problem, add `unstable_cache` tags to `src/lib/queries.ts` and revalidate them from the admin actions.                                                                                           |

---

## 6. Phase 2 — not built, schema left compatible

Online payment (bKash/Nagad/SSLCommerz), a student portal, SMS reminders, QR
codes on certificates linking to `/verify`, WhatsApp Business API auto-reply,
event registration, alumni showcase, Google Reviews, an EMI calculator, and a
Facebook Lead Ads webhook.

The `Student`, `Batch` and `Application` models already carry the fields these
features need (`certificateNo`, `verifiable`, `seats`, `source`), so none of
them requires a breaking migration.

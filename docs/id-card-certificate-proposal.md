# Proposal: student ID cards and certificate generation

Written 29 Sep 2026, after the request to "make card generate and certificate
generate/print much more advanced".

**Status: stages 1, 2A and 4 are built** (29 Sep 2026), against the BTEB
certificate and registration card the owner supplied as references. What is
live now:

- `/admin/certificates/<id>/print` — A4 landscape certificate.
- `/admin/students/<id>/card` — A4 registration card, and `?view=wallet` for a
  CR80 wallet card (front and back, two to a sheet with crop marks).
- `/card/<token>` — the public page the card QR opens: photo, name, roll,
  course, status. Signed token, `noindex`, no phone or address.
- Site Settings → **Certificates & cards**: titles, wording, the red footer
  line, three signatories with signature images, seal, watermark, card validity
  and the numbered card rules.

Also built, on the owner's instruction (29 Sep): the **certificate number
series**. The shape is set once in Site Settings (`{prefix}-{course}-{year}-{seq:4}`
by default) and the **Generate** button on a certificate takes the next number
in that series from an atomic counter, skipping any number the office typed by
hand. Printing is on **plain white paper**: the whole design is printed, and
the pages force colour output so nobody has to remember the "background
graphics" checkbox.

Still open from stage 3: bulk issue for a whole batch, the approval step, the
print log and the delivery record. Stage 2B (visual template editor) is open.

The goal is to replace the two jobs the office does by hand today:

1. Making a student ID card (design in Photoshop or at a press, one at a time).
2. Making a course completion certificate (a pre-printed pad filled in by hand
   or by a typist, signed and stamped).

Both should become: pick the student, press print. What follows is a plan in
four stages, each usable on its own, so the office gets value early instead of
waiting for the whole thing.

---

## 0. What already exists

- `Student` (roll, name, course, batch, dates, status, BMDC, photo since today).
- `Certificate` (certificate number, student, course, type, session, issue date,
  grade, status VALID/REVOKED, QR token) and the public `/verify` page that
  looks a certificate up by number or BMDC and logs every lookup.
- Uploads through R2 with a protected prefix and signed token routes
  (built for the course book sample chapter, reusable here).
- A print pattern already proven twice: the health service serial sheet and the
  new admission form at `/admin/applications/<id>/print`.

So the data is in place. What is missing is the layout engine, the batch
workflow and the controls that make a printed document trustworthy.

---

## Stage 1: printable ID card (BUILT)

**What the office gets:** `/admin/students/<id>/card` renders a card at exactly
85.6 × 54 mm (CR80, the same size as a bank card), front and back, with crop
marks. Print on A4 with 10 per sheet, or hand the PDF to a press.

**Front:** MUTI logo and name, student photo, name, roll, course, batch,
session, blood group, a QR code, and "Valid until" (the batch end date plus a
grace period). **Back:** institute address and phone, the "if found, return to"
line, the rules the office wants on it, and the authorised signature.

**Technical shape**

- A print route like the admission form, not an image generator: HTML and CSS
  with `@page { size: 85.6mm 54mm; margin: 0 }`. The browser's "Save as PDF"
  gives a press-ready file, no server-side PDF library needed for stage 1.
- `bleed` and crop marks behind a `?sheet=10` switch for batch printing.
- The QR encodes `https://muti…/verify?card=<token>` where the token is a signed
  student id, the same HMAC helper the sample chapter uses. Scanning it opens a
  public page showing photo, name, roll, course and status, and nothing else.
- Photo is required; the card refuses to render without one and says so.

**Why this first:** it needs no new models beyond `Student.photo`, and the
office can use it the day it ships.

---

## Stage 2: certificate generation with a design the owner controls

The weakness of a hardcoded certificate layout is that the owner cannot change
it without a developer. Three options, in order of how advanced they are:

**Option A: fixed HTML template (fastest).** One layout in code, with the
institute name, logo, signatures and seal coming from Site Settings. The owner
can change wording, signatories and images, but not the layout.
**This is what was built.** The border is drawn as SVG (a navy and gold
guilloche with corner motifs) rather than shipped as an image, so it stays
sharp at any print resolution and cannot be deleted from the media library by
accident.

**Option B: template + background image (recommended).** The owner uploads the
pre-printed certificate paper as a background image (or a blank design made in
Canva), and the admin has a visual editor where each field (name, course,
session, roll, certificate number, date, QR) is dragged onto the design and
given a font size, weight, colour and alignment. The positions are stored as
JSON on a `CertificateTemplate` row. Printing overlays the fields on the
background at exactly the stored coordinates.

This is how school and university systems do it, and it means:

- The office can keep using the paper they already bought: set the background to
  blank and print only the text onto the pre-printed sheet.
- A new design is a new template, not a new deployment.
- Different templates per course type (CMU, DMU, ADMU, TVS) and per language.

**Option C: full drag-and-drop designer.** Shapes, images, rich text, multiple
pages. This is a product in itself; not worth building for one institute.

**Recommendation: build B.** The editor is a canvas with the background image,
absolutely positioned draggable field chips, and a right panel for the field's
type and style. Two days of work, and it removes the developer from the loop
forever.

**Model sketch**

```prisma
model CertificateTemplate {
  id          String   @id @default(cuid())
  name        String            // "CMU 2026", "DMU diploma"
  courseId    String?           // null = any course
  background  String?           // uploaded design, or blank for pre-printed paper
  widthMm     Float  @default(297)   // A4 landscape by default
  heightMm    Float  @default(210)
  /// [{ key, label, xMm, yMm, widthMm, align, font, sizePt, weight, colour, uppercase }]
  fields      Json
  isDefault   Boolean @default(false)
  active      Boolean @default(true)
}
```

Available field keys: `studentName`, `studentNameBn`, `fatherName`,
`courseName`, `courseFullName`, `session`, `batch`, `roll`, `certificateNo`,
`grade`, `issueDate`, `issueDateBn`, `bmdc`, `qr`, `photo`, plus free text.

---

## Stage 3: the workflow around the document

This is what turns a generator into a system, and it is the part that protects
the institute.

**Number series (BUILT).** `documents.certificateNumberFormat` in Site Settings
holds the pattern; `{prefix}`, `{course}`, `{type}`, `{year}`, `{yy}`, `{month}`
and `{seq}` (with `{seq:4}` to pad) are substituted, and everything except
`{seq}` forms the series key. Each series has its own row in `Counter`, so two
people issuing at the same moment cannot be handed the same number, and the
result is checked against the table before it is returned, so a number the
office typed by hand is never handed out twice. See `src/lib/certificate-number.ts`.

**Issue in bulk (open).** Select a batch, see every student with their status,
tick the ones who passed, press "Issue certificates": the system allocates the
numbers from the series above, writes the `Certificate` rows, and produces one
document with all of them for printing.

**Never two numbers for one student.** A unique constraint on
(student, course, type) already exists in spirit; make it explicit, and make
re-issue a deliberate action that marks the old one REVOKED with a reason and
issues a new number ending in `-R2`.

**Print log.** Every print records who printed it and when. A certificate
printed twice is visible. This matters the day someone claims a forgery.

**Approval step.** Draft → approved by a super admin → printable. A staff
account can prepare, only an approver can release. Uses the existing permission
system (`certificates.manage` exists; add `certificates.issue`).

**Delivery record.** Who collected the certificate, when, signature taken, or
posted with a tracking number. Turns "we gave it to him last year" into a date.

---

## Stage 4: what makes it genuinely hard to fake (BUILT)

The public `/verify` page already exists. These additions raise it from a
lookup to a verification system:

1. **QR on every document** pointing at `/verify/<token>`, where the token is a
   signed id rather than the certificate number, so a QR cannot be guessed by
   counting upward from a real number.
2. **A verification card that shows the photo.** The photo on the paper and the
   photo on the screen must match. This is the single most effective control,
   and it is why student photos went in today.
3. **A short security line printed on the certificate**: the institute code, a
   check digit derived from the certificate number, and the issue date. A
   mismatch between the printed line and the database is detectable by eye.
4. **Micro-text or a guilloche border** in the background design: cheap to
   include, hard to reproduce on an office photocopier.
5. **Revocation that is visible.** A revoked certificate shows red on /verify
   with the reason and the date, rather than "not found". Employers checking a
   dismissed student see the truth.
6. **Rate limiting and the lookup log** are already there; add an admin alert
   when one IP checks many numbers in a row, which is what number-guessing
   looks like.

Optional, later: a digitally signed PDF (PAdES) so the file itself carries a
certificate chain. Useful when sending certificates by email to employers
abroad; overkill for local use.

---

## What the printed documents look like now

**Certificate (A4 landscape).** Letterhead with the logo, the institute name in
English and Bangla, the address and the authority line. Then the title in
Roman capitals, a gold rule with a diamond, and the declaration: "This is to
certify that **NAME**, son / daughter of ..., bearing Roll No ... and BMDC Reg.
No ..., has successfully completed the course of **COURSE**, conducted by this
institute in the session ..., securing ...". Under it a facts strip
(certificate number, date of issue, institute code), up to three signature
blocks with the seal printed faintly behind them, the QR with its address, and
the red footer line. A revoked certificate prints with a REVOKED overprint and
the admin warns before printing it.

**Registration card (A4 portrait).** The same letterhead in compact form, the
title in a red rule box, serial number and course block, a 33 × 42 mm photo
box, then the field list in the order the board uses (name, name in Bangla,
father, mother, sex, blood group, date of birth, institute and code, address,
mobile, BMDC, board roll, board registration, session, admission date, valid
until). Signature of the student and of the head of the institute, the numbered
rules, the QR and the date of print. Fields with no value print as ruled lines.

**Wallet card (85.6 × 54 mm).** Front: navy header band with the logo and the
institute name, photo, name in both languages, roll, course, batch, blood group
and validity, closed by a navy-gold-red strip. Back: QR, address and phone, the
first three rules, the course name and an authorised signature line. Both print
on one A4 sheet with crop marks.

Fonts: Cinzel for the headings and EB Garamond for the body, loaded only inside
the admin, so no visitor downloads them.

---

## What we need from the owner before building the rest

1. **A sample of the current certificate** (photo or scan of a blank one) and
   the current ID card, if one exists.
2. **The certificate number format** actually used today, so the series
   continues rather than restarting.
3. **Who signs**: names, designations, and signature images for each signatory,
   plus whether the seal is printed or stamped by hand.
4. ~~**Paper**: pre-printed stock, or plain paper?~~ **Answered: plain white
   paper, full design printed.** 120 gsm or heavier is worth buying for the
   certificate; ordinary 80 gsm looks thin for something a doctor frames.
5. **Card printing**: does the office print cards itself (PVC printer), use a
   press, or laminate A4 prints?
6. **Language**: Bangla, English, or both on one document.
7. **Which courses get a certificate** and which get a diploma or transcript.

---

## Suggested order and rough effort

| Stage | What                                                               | Effort      |
| ----- | ------------------------------------------------------------------ | ----------- |
| 1     | ID card print route, QR, 10-per-sheet                              | ~1 day      |
| 2A    | Certificate print with a fixed layout from Site Settings           | ~half a day |
| 2B    | Template model + visual field editor                               | ~2 days     |
| 3     | Bulk issue, number series, approval, print log, delivery record    | ~2 days     |
| 4     | QR verification page with photo, security line, revocation display | ~1 day      |

Stage 1 and 2A together already replace the manual work. Everything after that
is about scale and trust.

A note on scope: the student portal, attendance and fees in addendum 2 section B
are Phase 2 and are not touched by any of this. The certificate work above sits
entirely inside what is already built.

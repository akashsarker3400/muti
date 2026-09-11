# Addendum 4: Free Health Service (বিনামূল্যে স্বাস্থ্যসেবা)

**For the AI maintaining the live MUTI site. Phase 1.5, build now. Bilingual, light theme, mobile-first.**

## Context
MUTI provides, every day, free ultrasound examination with a written report and free doctor consultation for poor and underprivileged people, as a community health service run alongside the training. This must become a visible part of the site: it is real social proof, it explains where the "real patient" practical comes from, and it is a service people in Mymensingh will search for.

## 1. Where it appears
1. **Main nav** item: "স্বাস্থ্যসেবা / Health Service" (between Admission and Results).
2. **Homepage section** (after "Why choose MUTI"): green-tinted band (`--bg-soft` with a green accent, not dark) titled "বিনামূল্যে আল্ট্রাসাউন্ড ও ডাক্তার পরামর্শ", 2 lines of text, three stat tiles (patients served, days per week, since year), buttons "সিরিয়াল নিন" and "বিস্তারিত".
3. **Dedicated page** `/health-service` (EN `/en/health-service`).
4. **Footer** quick link + one line "প্রতিদিন গরীব ও অসহায় মানুষের জন্য বিনামূল্যে আল্ট্রাসাউন্ড সেবা".
5. **Announcement bar** preset text option: "আজ বিনামূল্যে আল্ট্রাসাউন্ড সেবা চালু আছে, সিরিয়ালের জন্য কল করুন 01778-838644".

## 2. Page `/health-service` sections
1. Hero (image of the service, admin-set): title "বিনামূল্যে স্বাস্থ্যসেবা / Free Health Service", subtitle "গরীব ও অসহায় মানুষের জন্য প্রতিদিন বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা, রিপোর্ট ও ডাক্তার পরামর্শ".
2. What we provide (icon cards, admin list): Free ultrasound examination; Written report same day; Free doctor consultation; Referral advice to hospital when needed. `TODO` confirm exact list and which scan types (e.g. abdomen, pregnancy, KUB).
3. Who can get it (admin rich text): poor and underprivileged patients; what to bring (previous prescription/reports if any, phone number). `TODO` any eligibility rule.
4. Schedule card: days and time (Site Settings `health.days`, `health.time`, e.g. "শনিবার থেকে বৃহস্পতিবার, সকাল ১০টা থেকে দুপুর ১টা" `TODO`), location (same address), "Today open / closed" badge computed from schedule + admin holiday toggle.
5. How it works (4 steps): call or submit serial form > come on the given day > examination by trained doctors under supervision of experienced sonologists > report and consultation.
6. Serial / appointment form (section 3).
7. Impact stats (admin-editable numbers with "last updated" date): patients served total, this month, reports given. Only show numbers the office confirms; hide tile if empty.
8. Transparency note (short, admin rich text): scans are performed by MBBS doctors in training under supervision of experienced sonologists; the report is a screening report; patients are advised to consult a specialist for treatment. This wording protects the institute; `TODO` owner to approve.
9. Gallery album "Health service" (reuse GalleryAlbum, flag `isHealthService`), photos with patient consent only, faces blurred or no faces.
10. Supporters / partners (optional): reuse Partner with type COMMUNITY.
11. CTA: "সহযোগিতা করতে চান?" with contact button (optional toggle), for donors or hospitals that want to refer patients.

## 3. Patient serial (appointment) form
Keep it minimal, patients are not tech users.
- Fields: name*, phone*, age, gender, area/village, problem in one line (optional), preferred date (optional), "Referred by" (optional). Turnstile + rate limit.
- Saves as `HealthAppointment(id, serialNo, name, phone, age, gender, area, complaint, preferredDate, status REQUESTED|CONFIRMED|SEEN|CANCELLED, note, createdAt)`. `serialNo` from Counter key `health-serial-YYYYMMDD` resets daily.
- On submit: success screen with serial number and the address, plus WhatsApp button prefilled "আমি {name}, বিনামূল্যে আল্ট্রাসাউন্ডের সিরিয়াল নিতে চাই। সিরিয়াল নং {serialNo}". Optional SMS confirmation via `notify('HEALTH_SERIAL')` when SMS driver exists.
- Also a big "Call for serial" button (tel: link) above the form, since many patients will prefer calling.

## 4. Admin
- Menu "Health Service": Appointments list (today by default, filter by date/status, mark SEEN, print today's serial list), Settings (schedule, holiday toggle, stats, texts, hero image), Content (services list, eligibility, transparency note), Gallery album shortcut.
- Daily stat increment: "Patients seen today" quick entry so stats stay current without CSV.
- Permission: `health.manage`, `health.appointments`.

## 5. Privacy rules (important)
- Patient records are health data. Store only what the form collects, no diagnosis text in the public system, never show patient names publicly, no patient photos without written consent. Appointments auto-anonymize (name and phone hashed) after 90 days via the nightly job. Add this to the privacy page.

## 6. SEO
- Meta: "ময়মনসিংহে বিনামূল্যে আল্ট্রাসাউন্ড পরীক্ষা ও ডাক্তার পরামর্শ | MUTI". JSON-LD `MedicalClinic` with `isAcceptingNewPatients` and opening hours, plus `EducationalOrganization` on the main site. Keywords: "free ultrasound mymensingh", "বিনামূল্যে আল্ট্রাসাউন্ড ময়মনসিংহ".
- Add the service to the Google Business Profile description (owner task).

## 7. Seed
Section hidden until admin publishes (`health.published = false` by default). Seed texts above with `TODO` marks visible only in admin.

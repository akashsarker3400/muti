# Addendum 4.1: Health Service copy update (Maternal & Child focus)

**For the AI working on Addendum 4. This replaces the placeholder texts in Addendum 4 with the institute's official commitment statement and shifts the positioning of the Health Service to maternal and child health. Structure from Addendum 4 stays the same.**

## 1. Official copy (use verbatim in Bangla; EN is the approved translation)

**Section label:** MUTI Ultrasound-এর অঙ্গীকার / Our Commitment

**Tagline (hero, large, quoted):**
BN: "আল্ট্রাসোনোগ্রাম পরীক্ষার অভাবে আর যেন কোনো মা ও শিশুর অকালমৃত্যু না ঘটে।"
EN: "No mother or child should die prematurely for want of an ultrasound examination."

**Intro paragraph:**
BN: মাতৃ ও শিশুর সুস্থতা এবং নিরাপদ মাতৃত্ব নিশ্চিত করার লক্ষ্যে MUTI Ultrasound-এর একটি মানবিক উদ্যোগ:
EN: A humanitarian initiative by MUTI Ultrasound to ensure the health of mothers and children and safe motherhood:

**Two service pillars (icon cards):**
- বিনা মূল্যে আল্ট্রাসোনোগ্রাম পরীক্ষা / Free ultrasonogram examination
- বিনা মূল্যে চিকিৎসকের পরামর্শ / Free doctor consultation

**Goal paragraph:**
BN: প্রয়োজনীয় আল্ট্রাসোনোগ্রাম পরীক্ষা ও চিকিৎসকের পরামর্শের মাধ্যমে গর্ভবতী মা ও শিশুর সুস্থতা সম্পর্কে সচেতনতা বৃদ্ধি করাই আমাদের লক্ষ্য।
EN: Our goal is to raise awareness about the health of expectant mothers and their children through necessary ultrasonogram examinations and medical advice.

**Closing line (footer of the section, bold):**
BN: মানবতার সেবায় MUTI Ultrasound। একটি সুস্থ মা, একটি সুস্থ শিশু, আমাদের অঙ্গীকার।
EN: MUTI Ultrasound, in the service of humanity. A healthy mother, a healthy child, our commitment.

Note: do not use em dashes anywhere; the source text had them, replace with a colon, comma, or full stop as shown above.

## 2. Positioning changes
- Page title stays "বিনামূল্যে স্বাস্থ্যসেবা / Free Health Service", but the hero now leads with the quoted tagline, then the intro paragraph, then the two pillars.
- Primary audience wording everywhere: "গর্ভবতী মা ও শিশু" (expectant mothers and children). Keep "গরীব ও অসহায় মানুষ" as the eligibility line, not the headline.
- Serial form: add field "গর্ভবতী? / Pregnant?" (Yes/No/Not applicable) and, if yes, "গর্ভকাল (মাস) / Months of pregnancy" (optional). Store on `HealthAppointment`. Do not collect anything further.
- Homepage health section: use the tagline as the heading and the closing line as the sub line. Button labels unchanged.
- Announcement bar preset: "গর্ভবতী মায়েদের জন্য বিনামূল্যে আল্ট্রাসোনোগ্রাম ও ডাক্তার পরামর্শ, সিরিয়াল: 01778-838644".
- Impact stats labels: "মা ও শিশু সেবা পেয়েছেন" (mothers and children served), "রিপোর্ট প্রদান" (reports given), "চিকিৎসকের পরামর্শ" (consultations).
- Transparency note (Addendum 4 section 2.8) stays, add one line: "জরুরি বা ঝুঁকিপূর্ণ কিছু পাওয়া গেলে দ্রুত নিকটস্থ হাসপাতাল বা বিশেষজ্ঞের কাছে রেফার করা হয়।" / "If anything urgent or high-risk is found, the patient is referred promptly to the nearest hospital or specialist."
- SEO: add keywords "গর্ভবতী মায়ের বিনামূল্যে আল্ট্রাসনোগ্রাম ময়মনসিংহ", "free pregnancy ultrasound mymensingh". JSON-LD `MedicalClinic` with `medicalSpecialty: Obstetric`.
- OG image for /health-service: the tagline over a soft image, MUTI logo, "বিনামূল্যে" badge.

## 3. Admin
All of the above texts live in Health Service > Content and are editable; seed with the copy in section 1 and set `health.published = true` once the office confirms schedule and scan types (still `TODO`).

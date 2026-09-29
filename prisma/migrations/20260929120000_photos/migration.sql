-- Passport-size photos: on the student record (used by the ID card) and on
-- the admission application (uploaded by the applicant or added at the desk).
ALTER TABLE "Student" ADD COLUMN "photo" TEXT;
ALTER TABLE "Application" ADD COLUMN "photo" TEXT;

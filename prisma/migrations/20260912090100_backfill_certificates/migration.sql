-- Addendum 3 §1: certificates now live in their own table. Every student the
-- office had already marked verifiable with a certificate number gets a
-- Certificate row, so /verify keeps answering for them. Guarded so a rerun
-- never duplicates.
INSERT INTO "Certificate" (
  "id", "certificateNo", "studentId", "courseId", "batchName", "type",
  "issuedAt", "grade", "verifyToken", "status", "createdAt", "updatedAt"
)
SELECT
  'cert_' || md5(s."id"),
  s."certificateNo",
  s."id",
  s."courseId",
  b."name",
  'COURSE',
  s."completionDate",
  s."resultGrade",
  'vt_' || md5(s."id" || ':verify'),
  'VALID',
  now(),
  now()
FROM "Student" s
LEFT JOIN "Batch" b ON b."id" = s."batchId"
WHERE s."certificateNo" IS NOT NULL
  AND s."certificateNo" <> ''
  AND s."verifiable" = true
  AND NOT EXISTS (
    SELECT 1 FROM "Certificate" c WHERE c."certificateNo" = s."certificateNo"
  );

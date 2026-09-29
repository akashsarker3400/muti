-- Certificates issued before the approval step existed are approved as they
-- stand. They were printed and handed over under the old flow, so the gate
-- added by the previous migration must not retroactively make the register
-- claim the office has forty unapproved certificates in its files.
--
-- `approvedById` is deliberately left NULL: nobody approved these, and naming
-- an admin who did not would be worse than an empty field.
UPDATE "Certificate"
SET "approvedAt" = "createdAt"
WHERE "approvedAt" IS NULL;

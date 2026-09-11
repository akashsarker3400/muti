-- Default logos for the two government bodies MUTI is affiliated with.
--
-- Neither the Bangladesh Technical Education Board nor the Ministry of
-- Education publishes a separate mark: both of their official sites serve the
-- same national emblem as their site logo. The file ships in the repository
-- (public/partners/) because the uploads volume starts empty on a fresh
-- deployment.
--
-- Only rows that have no logo yet are touched, so a logo an admin uploaded is
-- never overwritten.
UPDATE "Partner"
SET "logo" = '/partners/bangladesh-govt-emblem.png'
WHERE ("logo" IS NULL OR "logo" = '')
  AND "type" = 'AFFILIATION'
  AND (
    "name" ILIKE '%Technical Education Board%'
    OR "name" ILIKE '%Ministry of Education%'
  );

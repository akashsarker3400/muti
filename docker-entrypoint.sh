#!/bin/sh
# Applies pending migrations, seeds the database, then starts the standalone
# server (section 12).
#
# The seed itself decides what to do: it always ensures the admin user and the
# Site Settings row exist, and only seeds courses / notices / pages when the
# User table is empty, so a redeploy never resurrects content staff deleted.
set -e

# A missing volume is the single most common cause of "all images broken":
# the directory exists in the image, but everything written to it vanishes
# on the next deploy. Say so in the log where the deploy is being watched.
if ! grep -qs " ${UPLOAD_DIR:-/app/uploads} " /proc/mounts; then
  echo "!!! WARNING: ${UPLOAD_DIR:-/app/uploads} is not a mounted volume."
  echo "!!! Uploaded images and PDFs will be lost on the next redeploy."
  echo "!!! Coolify -> application -> Storages -> add a volume at /app/uploads."
fi

echo "==> Applying database migrations"
node ./node_modules/prisma/build/index.js migrate deploy

echo "==> Running seed"
node prisma/seed.mjs

echo "==> Starting Next.js"
exec node server.js

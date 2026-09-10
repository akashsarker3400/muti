#!/bin/sh
# Applies pending migrations, seeds the database, then starts the standalone
# server (section 12).
#
# The seed itself decides what to do: it always ensures the admin user and the
# Site Settings row exist, and only seeds courses / notices / pages when the
# User table is empty, so a redeploy never resurrects content staff deleted.
set -e

echo "==> Applying database migrations"
node ./node_modules/prisma/build/index.js migrate deploy

echo "==> Running seed"
node prisma/seed.mjs

echo "==> Starting Next.js"
exec node server.js

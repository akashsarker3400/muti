# ---------------------------------------------------------------------------
# MUTI website — multi-stage image for Coolify (section 12).
# Next.js `output: "standalone"` keeps the runtime layer small.
# ---------------------------------------------------------------------------

FROM node:20-alpine AS base
# sharp and Prisma need libc compatibility on Alpine.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app


# --- dependencies ----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


# --- build -----------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Prisma client is generated from the schema; no database is needed for
# this step, which is why every public page renders dynamically at runtime.
RUN npx prisma generate

# NEXT_PUBLIC_* values are inlined at build time. Coolify passes the real
# origin as a build arg; it falls back to a relative-safe default.
ARG NEXT_PUBLIC_SITE_URL="http://localhost:3000"
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# Bundle the TypeScript seed into plain ESM so the runtime image needs no
# TypeScript loader (see scripts/build-seed.mjs).
RUN node scripts/build-seed.mjs


# --- prisma runtime --------------------------------------------------------
# The entrypoint runs `migrate deploy` and the seed, and neither the Prisma CLI
# nor the driver adapter survives Next's standalone trace. Installing them into
# their own prefix lets npm resolve the whole tree: hand-picking directories
# missed @prisma/config's `effect`, and @prisma/studio-core, which the CLI
# loads eagerly even for `migrate deploy`.
#
# The versions are read from the installed tree, so this can never drift from
# package-lock.json.
FROM base AS prisma-runtime
WORKDIR /prisma-runtime
COPY --from=deps /app/node_modules/prisma/package.json ./v-prisma.json
COPY --from=deps /app/node_modules/@prisma/adapter-pg/package.json ./v-adapter.json
COPY --from=deps /app/node_modules/dotenv/package.json ./v-dotenv.json
RUN npm init -y > /dev/null \
  && npm install --omit=dev --no-audit --no-fund \
    "prisma@$(node -p "require('./v-prisma.json').version")" \
    "@prisma/adapter-pg@$(node -p "require('./v-adapter.json').version")" \
    "dotenv@$(node -p "require('./v-dotenv.json').version")" \
  && rm v-prisma.json v-adapter.json v-dotenv.json


# --- runtime ---------------------------------------------------------------
FROM base AS runner
# ffmpeg makes the poster frame for uploaded videos (homepage additions, 2b).
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/app/uploads

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copied before the standalone bundle so the app's own traced modules win
# wherever the two trees overlap.
COPY --from=prisma-runtime /prisma-runtime/node_modules ./node_modules

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations, the schema and the bundled seed are needed by the entrypoint.
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/seed.mjs ./prisma/seed.mjs
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Persistent volume mount point for uploaded images and PDFs.
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
VOLUME ["/app/uploads"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]

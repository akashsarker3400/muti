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


# --- runtime ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/app/uploads

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations, the schema and the bundled seed are needed by the entrypoint.
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/seed.mjs ./prisma/seed.mjs
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# The Prisma CLI (for `migrate deploy`) is not part of the traced standalone
# bundle, so bring it in explicitly. Studio and the local dev server are
# dropped: they are never used inside the container.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# prisma.config.ts loads the connection string with dotenv (Prisma 7 no longer
# reads .env by itself).
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
RUN rm -rf node_modules/@prisma/studio-core node_modules/@prisma/dev

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

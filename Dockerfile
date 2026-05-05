# Use separate stages for production-only deps and full dev deps to optimize
# build size and speed on resource-constrained devices (e.g. Raspberry Pi).

# Production dependencies only (used by runtime image)
FROM node:22-alpine AS deps-prod
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# Use npm ci for deterministic installs; omit dev deps to keep the prod
# node_modules small. Use a cache mount when BuildKit is enabled to speed
# repeated installs on low-powered devices. If `npm ci` fails (no lockfile
# or engine mismatch), fall back to `npm install --omit=dev` so the build
# doesn't hard-fail on environments where `npm ci` isn't usable.
RUN --mount=type=cache,target=/root/.npm sh -lc "npm ci --omit=dev --prefer-offline || npm install --omit=dev --prefer-offline"

# Full dependency set (includes devDeps) for building and migrations
FROM node:22-alpine AS deps-all
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# Use `npm ci` when possible for deterministic installs; fall back to
# `npm install` if the lockfile is out of sync (common during rapid updates).
RUN --mount=type=cache,target=/root/.npm sh -lc "npm ci --prefer-offline || npm install --prefer-offline"

# Source + full node_modules — base for build (needs devDeps)
FROM deps-all AS srcdeps
WORKDIR /app
COPY --from=deps-all /app/node_modules ./node_modules
COPY . .

# Build the Next.js app (standalone output)
FROM srcdeps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=512
# Limit Node's heap during build to avoid OOM on low-memory devices.
# Keep the build command; Next.js will use the reduced heap.
RUN npm run build

# Migrator — used by the `migrate` service in docker-compose. Uses the
# full dependency set (drizzle-kit is a devDep) and `expect` to drive prompts.
FROM deps-all AS migrator
WORKDIR /app
RUN apk add --no-cache expect
COPY --from=deps-all /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=256
CMD ["expect", "-f", "scripts/migrate.exp"]

# Minimal runtime image using prod-only node_modules
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy only what's needed for runtime: public assets + standalone server +
# production node_modules (already baked into the builder output via npm ci).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Standalone mode needs public and static folders inside the standalone directory to serve them
RUN mkdir -p .next/standalone/public && cp -r public/* .next/standalone/public/ || true
RUN mkdir -p .next/standalone/.next/static && cp -r .next/static/* .next/standalone/.next/static/ || true

COPY --from=deps-prod /app/node_modules ./node_modules

# Ensure uploads directory exists and is writable by nextjs
RUN mkdir -p public/uploads && chown -R nextjs:nodejs public/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

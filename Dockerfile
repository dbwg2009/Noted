# 1. Install dependencies (incl. devDeps so drizzle-kit is available)
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm install --prefer-offline 2>/dev/null || npm install

# 2. Source + node_modules — shared base for build and migrate
FROM node:22-alpine AS srcdeps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 3. Build the Next.js app (standalone output)
FROM srcdeps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 4. Migrator — used by the `migrate` service in docker-compose
FROM srcdeps AS migrator
ENV NODE_ENV=production
# drizzle-kit push uses the `prompts` package which switches stdin into raw
# TTY mode, so plain piped input is ignored when the container isn't a TTY.
# `--force` suppresses data-loss prompts but NOT the "data integrity" ones
# (e.g. "do you want to truncate users?" before adding a unique constraint),
# which is what was hanging the migrate service.
#
# Fix: install `expect` and run drizzle-kit through scripts/migrate.exp,
# which gives it a real pseudo-TTY and presses Enter on every prompt to
# accept the highlighted default (always the safe option).
RUN apk add --no-cache expect
CMD ["expect", "-f", "scripts/migrate.exp"]

# 5. Minimal runtime image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure uploads directory exists and is writable by nextjs
# Remove esbuild platform binaries — dev-only, not needed at runtime, carry Go stdlib CVEs
RUN mkdir -p public/uploads && chown -R nextjs:nodejs public/uploads \
    && rm -rf node_modules/@esbuild

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

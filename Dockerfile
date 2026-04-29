# syntax=docker/dockerfile:1.7

# 1. Install dependencies (incl. devDeps so drizzle-kit is available)
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

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
CMD ["npx", "drizzle-kit", "push"]

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

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

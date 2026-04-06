# Multi-stage build for Next.js 15 dashboard

# Stage 1 (deps): install all dependencies for the build
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci

# Stage 2 (deps-prod): production-only node_modules (no devDeps)
FROM node:22-alpine AS deps-prod
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci --omit=dev

# Stage 3 (builder): compile the Next.js application
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Copy .env.prod as .env so NEXT_PUBLIC_* vars are available at build time
RUN if [ -f .env.prod ]; then cp .env.prod .env; fi
RUN npm run build

# Stage 4 (runner): lean production image
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat curl dumb-init
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application and production node_modules only
COPY --from=builder  --chown=nextjs:nodejs /app/.next    ./.next
COPY --from=builder  --chown=nextjs:nodejs /app/public   ./public
COPY --from=deps-prod --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder  --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3001

# Health check — start_period=30s for Next.js cold start on VPS
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init for proper signal forwarding (SIGTERM → Node.js)
CMD ["dumb-init", "node", "node_modules/.bin/next", "start", "-p", "3001"]

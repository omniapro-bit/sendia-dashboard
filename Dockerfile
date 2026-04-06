# Multi-stage build for Next.js 15 dashboard
# Stage 1: Builder (install all deps + build)
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci
COPY . .
# Copy .env.prod as .env so NEXT_PUBLIC_* vars are available at build time
RUN if [ -f .env.prod ]; then cp .env.prod .env; fi
RUN npm run build

# Stage 2: Runner (production-only)
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat curl dumb-init
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3001

# Health check — start_period=30s for Next.js cold start on VPS
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init for proper signal forwarding (SIGTERM → Node.js)
CMD ["dumb-init", "node", "node_modules/.bin/next", "start", "-p", "3001"]

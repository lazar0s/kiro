# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --filter @laundry/api --filter @laundry/shared

COPY tsconfig.base.json ./
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json ./apps/api/

WORKDIR /app/apps/api
RUN pnpm run build
RUN pnpm prisma generate

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 fastify

WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

USER fastify

ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "dist/main.js"]

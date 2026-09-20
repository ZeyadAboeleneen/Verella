# Build context is the repo root (see docker-compose.yml: context: .., dockerfile: docker/Dockerfile)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /repo

# ---- deps: full (dev+prod) install, for building ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile

# ---- prod-deps: production-only install, used to overlay the runner below.
# Next.js auto-bundles most server dependencies into the compiled output, but
# a local build showed .next/standalone/node_modules ending up nearly empty
# (mysql2, drizzle-orm, bcryptjs, next-auth, @aws-sdk/* weren't present as
# files) — likely fine if they were correctly inlined into the chunks, but
# unverified since this sandbox has no Docker/MySQL to actually run the
# container end-to-end. Overlaying a real prod install costs some image size
# but removes the risk entirely — treat as belt-and-suspenders, and feel free
# to drop the prod-deps stage + these three COPY lines below once you've
# confirmed a plain standalone image boots and serves DB-backed pages fine. ----
FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile --prod

# ---- builder: full source + Next build (standalone output) ----
FROM base AS builder
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /repo/packages/core/node_modules ./packages/core/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @verella/web build

# ---- runner: production image ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
# Overlay the real production node_modules at every workspace level pnpm
# uses for resolution (see prod-deps comment above).
COPY --from=prod-deps --chown=nextjs:nodejs /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /repo/packages/core/node_modules ./packages/core/node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]

# ---- migrator: one-off job (`docker compose run --rm migrator`) — keeps full
# node_modules (tsx, drizzle-kit) that the slim runner image deliberately drops ----
FROM builder AS migrator
WORKDIR /repo
CMD ["sh", "-c", "pnpm --filter @verella/db migrate && pnpm --filter @verella/db seed"]

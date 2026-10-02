# Build context is the repo root (see docker-compose.yml: context: .., dockerfile: docker/Dockerfile)
#
# Debian (glibc), not Alpine: onnxruntime-node — used for the automatic product
# background cut-out (apps/web/src/lib/media/background-removal.ts) — only
# ships glibc Linux binaries.
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /repo

# Every workspace project's manifest must be present, or `pnpm install
# --frozen-lockfile` sees a lockfile that doesn't match the workspace and fails.
FROM base AS manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
COPY openwa/package.json openwa/package.json

# ---- deps: full (dev+prod) install, for building ----
FROM manifests AS deps
RUN pnpm install --frozen-lockfile

# ---- prod-deps: production-only install, used to overlay the runner below.
# Next.js auto-bundles most server dependencies into the compiled output, but
# a local build showed .next/standalone/node_modules ending up nearly empty
# (mysql2, drizzle-orm, bcryptjs, next-auth, @aws-sdk/* weren't present as
# files). Overlaying a real prod install costs some image size but removes the
# risk entirely; it also carries the native packages kept external in
# next.config.ts (sharp, onnxruntime-node, @huggingface/transformers). ----
FROM manifests AS prod-deps
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

# ---- runner: production image (the website) ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs \
  # Downloaded AI model for the product background cut-out (a volume in compose).
  && mkdir -p /models && chown nextjs:nodejs /models
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
ENV TRANSFORMERS_CACHE_DIR=/models

CMD ["node", "apps/web/server.js"]

# ---- whatsapp: the self-hosted WhatsApp gateway (openwa/index.js) ----
FROM base AS whatsapp
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/openwa/node_modules ./openwa/node_modules
COPY openwa/package.json openwa/index.js ./openwa/
# The linked WhatsApp session lives here (a volume in compose) — owned by the
# image's unprivileged "node" user so it survives restarts and updates.
RUN mkdir -p /repo/openwa/auth_info && chown -R node:node /repo/openwa/auth_info
USER node
EXPOSE 3001
CMD ["node", "openwa/index.js"]

# ---- migrator: one-off job (`docker compose run --rm migrator`) — keeps full
# node_modules (tsx, drizzle-kit) that the slim runner image deliberately drops ----
FROM builder AS migrator
WORKDIR /repo
CMD ["sh", "-c", "pnpm --filter @verella/db migrate && pnpm --filter @verella/db seed"]

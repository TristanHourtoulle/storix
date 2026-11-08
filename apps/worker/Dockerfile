# Worker service: pg-boss jobs with sharp (prebuilt libvips for linux glibc).
# Build context: repository root. Node and pnpm come from Docker Hub and the npm registry only.

ARG NODE_IMAGE=node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c

FROM ${NODE_IMAGE} AS base
# pnpm 12 runs an install before every script by default; the images are immutable, so turn it off.
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true \
    pnpm_config_verify_deps_before_run=false
WORKDIR /app
COPY package.json ./
# pnpm version comes from the packageManager field, downloaded from registry.npmjs.org.
RUN corepack enable \
 && corepack install \
 && chmod -R a+rX "$COREPACK_HOME" \
 && pnpm --version

FROM base AS manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/storage/package.json packages/storage/

FROM manifests AS build
RUN pnpm install --frozen-lockfile --filter @storix/worker...
COPY . .
RUN pnpm build:worker

FROM manifests AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @storix/worker...

FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-workspace.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY apps/worker/package.json apps/worker/
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
# The migration gate compares against the Drizzle journal bundled into dist at build time.
USER node
CMD ["pnpm", "start:worker"]

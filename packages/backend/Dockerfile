# -----------------------------------------------------------------------------
# Multi-stage Dockerfile for Backstage backend + frontend bundle.
#
# Stage 1 (build):  full yarn install + tsc + yarn build:backend
# Stage 2 (runtime): minimal image with only production deps and the bundle.
#
# This Dockerfile is self-contained: it does NOT require the host to
# have run `yarn build:backend` first. That makes it compatible with
# `az acr build` from Azure Cloud Shell, where yarn is not installed.
#
# No BuildKit-only features (--mount=type=cache) are used, so it also
# works with legacy Docker builders that `az acr build` uses by default.
# -----------------------------------------------------------------------------

# ============================================================================
# Stage 1: build
# ============================================================================
FROM node:24-bookworm AS build

ENV PYTHON=/usr/bin/python3
ENV NODE_OPTIONS="--no-node-snapshot --max-old-space-size=4096"

# Build-time deps: python3 + g++ for node-gyp (isolate-vm, better-sqlite3),
# plus libsqlite3-dev for better-sqlite3.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy the full repo (minus .dockerignore exclusions).
# Done in one COPY so yarn workspaces resolve all packages/plugins at once.
COPY . .

# Install ALL deps (dev + prod) needed for tsc and the build.
RUN yarn install --immutable

# Compile TypeScript (catches type errors).
RUN yarn tsc

# Build the backend bundle. This produces:
#   packages/backend/dist/bundle.tar.gz
#   packages/backend/dist/skeleton.tar.gz
RUN yarn build:backend

# ============================================================================
# Stage 2: runtime
# ============================================================================
FROM node:24-bookworm-slim AS runtime

ENV PYTHON=/usr/bin/python3
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Runtime deps only: libsqlite3 (no -dev) for better-sqlite3, plus g++ and
# python3 for isolate-vm's native binding install at `yarn workspaces focus`.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

# Create /app owned by the node user BEFORE switching user. Without this,
# WORKDIR creates /app as root and subsequent COPY/RUN as `node` fail with
# "Cannot mkdir: Permission denied". BuildKit would handle this automatically,
# but `az acr build` uses the legacy docker builder by default.
RUN mkdir -p /app && chown -R node:node /app
USER node
WORKDIR /app

# Copy yarn config + skeleton from the build stage.
COPY --from=build --chown=node:node /build/.yarn ./.yarn
COPY --from=build --chown=node:node /build/.yarnrc.yml ./
COPY --from=build --chown=node:node /build/backstage.json ./
COPY --from=build --chown=node:node /build/yarn.lock ./
COPY --from=build --chown=node:node /build/package.json ./
COPY --from=build --chown=node:node /build/packages/backend/dist/skeleton.tar.gz ./

# Extract skeleton (only package.json files), then install production deps.
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz
RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# Copy examples (catalog seed data) and the app-config YAML files.
COPY --from=build --chown=node:node /build/examples ./examples
COPY --from=build --chown=node:node /build/app-config.yaml ./app-config.yaml
COPY --from=build --chown=node:node /build/app-config.production.yaml ./app-config.production.yaml

# Extract the actual backend bundle (compiled JS + frontend static assets).
COPY --from=build --chown=node:node /build/packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

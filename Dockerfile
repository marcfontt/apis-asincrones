# Stage 1: Build the backend bundle
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ libsqlite3-dev curl && rm -rf /var/lib/apt/lists/*
COPY . .
RUN yarn install --immutable
RUN yarn tsc || true
RUN yarn workspace backend build

# Stage 2: Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y python3 g++ build-essential libsqlite3-dev curl && rm -rf /var/lib/apt/lists/*

# Copy root configurations and yarn setup
COPY .yarn ./.yarn
COPY .yarnrc.yml backstage.json package.json yarn.lock ./

# Extract the skeleton to reconstruct the exact workspace structure (package.jsons)
COPY --from=build /app/packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# INSTEAD of "yarn workspaces focus --production" which discards modules or fails hoisting,
# we do a full bulletproof install to guarantee ALL modules are present!
RUN yarn install --immutable

# Extract the actual bundled code
COPY --from=build /app/packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# Configurations
COPY app-config.yaml app-config.production.yaml ./

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

EXPOSE 7007
CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

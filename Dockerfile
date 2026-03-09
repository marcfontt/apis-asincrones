# Stage 1 - Create yarn install background configuration and workspace skeleton
FROM node:22-bookworm-slim AS packages

WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/app/package.json packages/app/package.json
COPY packages/backend/package.json packages/backend/package.json

RUN find plugins -name "package.json" -maxdepth 2 | while read f; do \
    mkdir -p $(dirname $f) && cp $f $f; done 2>/dev/null || true

# Stage 2 - Install dependencies and build packages
FROM node:22-bookworm-slim AS build

# Install sqlite3 dependencies
RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=packages /app ./

RUN yarn install --immutable

COPY . .

RUN yarn tsc || true
RUN yarn workspace backend build

# Stage 3 - Build the final image
FROM node:22-bookworm-slim AS runner

# Install isolate-vm dependencies & sqlite3
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy files needed by Yarn
COPY .yarn ./.yarn
COPY .yarnrc.yml ./
COPY backstage.json ./

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Copy the skeleton and install production dependencies
COPY --from=build /app/packages/backend/dist/skeleton.tar.gz ./
COPY yarn.lock package.json ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz
RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# Copy the actual bundled backend payload
COPY --from=build /app/packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# Copy config files
COPY app-config.yaml app-config.production.yaml ./

EXPOSE 7007
CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

FROM node:22-bookworm-slim

WORKDIR /app

# Install native dependencies
RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Copy all the current code
COPY . .

# CRITICAL FIX: Eliminate the stale local `dist` cache which caused the previous crash.
RUN rm -rf packages/backend/dist
RUN rm -rf packages/app/dist

# Install and build EVERYTHING fresh
RUN yarn install --immutable
RUN yarn tsc || true
RUN yarn workspace backend build

# Extract the built bundle.tar.gz locally over the clean source!
# THIS places the fresh `/app/packages/backend/dist/index.cjs.js` right where Node expects it,
# while completely preserving the healthy `node_modules` installed by yarn!
RUN tar xzf packages/backend/dist/bundle.tar.gz

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"
EXPOSE 7007

# Run using the purely compiled production bundle (which automatically serves the frontend static files on port 7007)
CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

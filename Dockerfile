FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Copy yarn and config files
COPY package.json yarn.lock .yarnrc.yml backstage.json ./
COPY .yarn ./.yarn

# Copy all packages and plugins
COPY packages ./packages
COPY plugins ./plugins

# Install all dependencies
RUN yarn install --immutable

# Build the backend
RUN yarn tsc || true
RUN yarn workspace backend build

# Set environment variables for production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Copy configurations
COPY app-config.yaml app-config.production.yaml ./

# Expose port
EXPOSE 7007

# Run the backend directly from the workspace
CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

FROM node:22-bookworm-slim

WORKDIR /app

# Install native dependencies required by Backstage/SQLite
RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Copy all the current code
COPY . .

# CRITICAL FIX: The Azure Cloud Shell naturally accumulates old compilations in `dist/`.
# If `dist/` exists, the `yarn start` command blindly trusts it over the fresh `src/`!
# We nuke ALL local generic `dist` distributions so it is forced to do a fresh native run.
RUN rm -rf packages/backend/dist
RUN rm -rf packages/app/dist

# Install the dependencies safely
RUN yarn install --immutable

# Set environmental variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Expose port
EXPOSE 7007

# Run using the native developer script!
CMD ["yarn", "workspace", "backend", "start", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

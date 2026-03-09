FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Copy all files
COPY . .

# Install dependencies exactly as they are dynamically resolved by Yarn
RUN yarn install --immutable

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Expose the backend port
EXPOSE 7007

# Start the backend precisely as if we were developing locally, 
# ensuring all Yarn workspace paths are natively respected!
CMD ["yarn", "workspace", "backend", "start", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

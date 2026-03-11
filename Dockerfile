FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 make g++ libsqlite3-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN rm -rf packages/backend/dist
RUN rm -rf packages/app/dist

RUN yarn install --no-immutable
RUN yarn tsc || true
RUN yarn workspace backend build

RUN tar xzf packages/backend/dist/bundle.tar.gz

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"
EXPOSE 7007

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]

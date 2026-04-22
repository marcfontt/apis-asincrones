FROM node:22-slim AS builder
WORKDIR /app
COPY packages/benchmark-orchestrator/package.json ./package.json
RUN npm install
COPY packages/benchmark-orchestrator/tsconfig.json ./tsconfig.json
COPY packages/benchmark-orchestrator/src/ ./src/
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY packages/benchmark-orchestrator/package.json ./package.json
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV PORT=3003
ENV ELASTICSEARCH_URL=http://elasticsearch:9200
EXPOSE 3003
CMD ["node", "dist/index.js"]

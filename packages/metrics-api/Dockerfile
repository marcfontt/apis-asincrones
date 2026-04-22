FROM node:22-slim AS builder
WORKDIR /app
COPY packages/metrics-api/package.json ./package.json
RUN npm install
COPY packages/metrics-api/tsconfig.json ./tsconfig.json
COPY packages/metrics-api/src/ ./src/
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY packages/metrics-api/package.json ./package.json
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV PORT=3004
ENV ELASTICSEARCH_URL=http://elasticsearch:9200
EXPOSE 3004
CMD ["node", "dist/index.js"]

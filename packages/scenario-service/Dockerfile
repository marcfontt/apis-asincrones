FROM node:22-slim AS builder

WORKDIR /app

COPY packages/scenario-service/package.json ./package.json
RUN npm install

COPY packages/scenario-service/tsconfig.json ./tsconfig.json
COPY packages/scenario-service/src/ ./src/
RUN npx tsc

FROM node:22-slim

WORKDIR /app

COPY packages/scenario-service/package.json ./package.json
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=3002
ENV ELASTICSEARCH_URL=http://elasticsearch:9200

EXPOSE 3002

CMD ["node", "dist/index.js"]

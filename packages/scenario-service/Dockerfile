FROM node:22-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=3002
ENV ELASTICSEARCH_URL=http://elasticsearch:9200

EXPOSE 3002

CMD ["node", "dist/index.js"]

FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm AS builder
WORKDIR /app
COPY package.json ./package.json
RUN npm install
COPY tsconfig.json ./tsconfig.json
COPY src/ ./src/
RUN npx tsc

FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm
WORKDIR /app
COPY package.json ./package.json
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENV PORT=3003
ENV ELASTICSEARCH_URL=http://elasticsearch:9200
EXPOSE 3003
CMD ["node", "dist/index.js"]

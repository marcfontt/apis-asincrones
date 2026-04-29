FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

WORKDIR /app

COPY package.json ./package.json
RUN npm install

COPY src/ ./src/
COPY tsconfig.json ./tsconfig.json

RUN npx tsc

ENV NODE_ENV=production
ENV PORT=3001
ENV ELASTICSEARCH_URL=http://elasticsearch:9200

EXPOSE 3001
CMD ["node", "dist/index.js"]

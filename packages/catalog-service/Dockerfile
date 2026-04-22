FROM node:22-slim

WORKDIR /app

COPY packages/catalog-service/package.json ./package.json
RUN npm install

COPY packages/catalog-service/src/ ./src/
COPY packages/catalog-service/tsconfig.json ./tsconfig.json

RUN npx tsc

ENV NODE_ENV=production
ENV PORT=3001
ENV ELASTICSEARCH_URL=http://elasticsearch:9200

EXPOSE 3001
CMD ["node", "dist/index.js"]

FROM node:20-alpine
WORKDIR /app
COPY packages/load-generator/package.json ./package.json
RUN npm install
COPY packages/load-generator/tsconfig.json ./tsconfig.json
COPY packages/load-generator/src ./src
RUN npm run build
CMD ["node", "dist/index.js"]

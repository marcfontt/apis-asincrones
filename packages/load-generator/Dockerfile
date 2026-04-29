FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm
WORKDIR /app
COPY package.json ./package.json
RUN npm install
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build
CMD ["node", "dist/index.js"]

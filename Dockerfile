FROM node:20-bookworm-slim AS base
WORKDIR /app

# Build tooling for native deps like better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/build ./build
CMD ["node", "build/index.js"]

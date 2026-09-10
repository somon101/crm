# Self-contained build: this directory only, no monorepo workspace context needed
# (the backend has zero cross-workspace dependencies). Explicit multi-stage Docker
# build instead of relying on the host platform's monorepo auto-detection, which
# kept losing the compiled dist/ output between build and run phases on Railway.
FROM node:20-slim AS builder
WORKDIR /app
# OpenSSL must be present before `npm install` runs, because our postinstall hook
# (`prisma generate`) needs it to detect the engine target — Prisma otherwise only
# warns and guesses, which is fine for generate but risks the query engine failing
# to load later.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
# prisma/schema.prisma must exist before `npm install`, since that's where its
# postinstall hook (`prisma generate`) looks for it — installing before copying
# the rest of the source is normally good layer-caching practice, but the schema
# is the one file that hook needs early.
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build && ls -la dist && (find dist -maxdepth 2 || true)

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

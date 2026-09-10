# Self-contained build: this directory only, no monorepo workspace context needed
# (the backend has zero cross-workspace dependencies). Explicit multi-stage Docker
# build instead of relying on the host platform's monorepo auto-detection, which
# kept losing the compiled dist/ output between build and run phases on Railway.
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

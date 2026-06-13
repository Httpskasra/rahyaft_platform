
# ─── Development image ────────────────────────────────────────
FROM node:22-alpine AS dev

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]


# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci

COPY . .

# ✅ اول prisma generate، بعد build
RUN npx prisma generate
RUN npm run build


# ─── Production image ─────────────────────────────────────────
FROM node:22-alpine AS prod

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci --omit=dev

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/prisma.config.ts ./prisma.config.ts

RUN npx prisma generate

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/src/main"]
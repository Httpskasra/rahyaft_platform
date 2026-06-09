
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

# ✅ schema را کپی کن تا prisma generate در prod کار کند
COPY --from=build /usr/src/app/prisma ./prisma

# ✅ prisma generate در prod هم اجرا شود
RUN npx prisma generate

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/dist/prisma.config.js ./prisma.config.js
COPY --from=build /usr/src/app/prisma ./prisma

# ✅ دیگر نیازی به کپی src/generated نیست (generate بالا آن را می‌سازد)
# COPY --from=build /usr/src/app/src/generated ./src/generated

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/src/main"]
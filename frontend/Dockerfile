
# ─── Development image ────────────────────────────────────────
FROM node:22-slim  AS dev

WORKDIR /usr/src/app

# COPY .npmrc ./
COPY package.json package-lock.json ./
RUN npm ci 
# RUN npm ci --registry=https://package-mirror.liara.ir/repository/npm/

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--port", "3001"]


# ─── Build stage ──────────────────────────────────────────────
FROM node:22-slim  AS build    

WORKDIR /usr/src/app

# COPY .npmrc ./
COPY package.json package-lock.json ./
RUN npm ci 
# RUN npm ci --registry=https://package-mirror.liara.ir/repository/npm/

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build


# ─── Production image ─────────────────────────────────────────
FROM node:22-slim  AS prod

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=build /usr/src/app/.next/standalone ./
COPY --from=build /usr/src/app/.next/static ./.next/static
COPY --from=build /usr/src/app/public ./public

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001 || exit 1

CMD ["node", "server.js"]

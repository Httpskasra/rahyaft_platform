
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
FROM node:22-slim AS prod

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=build /usr/src/app/.next/standalone ./
COPY --from=build /usr/src/app/.next/static ./.next/static
COPY --from=build /usr/src/app/public ./public

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]

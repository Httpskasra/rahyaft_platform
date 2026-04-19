# # ─── Development image ────────────────────────────────────────
# FROM node:22-alpine AS dev

# WORKDIR /usr/src/app

# COPY .yarnrc ./
# COPY package.json yarn.lock ./
# RUN yarn install --frozen-lockfile
# # RUN yarn config set registry https://mirror-npm.runflare.com &&  yarn install --frozen-lockfile

# COPY . .

# EXPOSE 3000

# CMD ["yarn", "start:dev"]


# # ─── Build stage ──────────────────────────────────────────────
# FROM node:22-alpine AS build

# WORKDIR /usr/src/app

# COPY .yarnrc ./
# COPY package.json yarn.lock ./
# RUN  yarn install --frozen-lockfile
# # RUN yarn config set registry https://mirror-npm.runflare.com && yarn install --frozen-lockfile

# COPY . .
# RUN yarn build


# # ─── Production image ─────────────────────────────────────────
# FROM node:22-alpine AS prod

# WORKDIR /usr/src/app

# ENV NODE_ENV=production

# COPY .yarnrc ./
# COPY package.json yarn.lock ./
# RUN yarn install --frozen-lockfile --production
# # RUN yarn config set registry https://mirror-npm.runflare.com && yarn install --frozen-lockfile --production

# COPY --from=build /usr/src/app/dist ./dist
# COPY --from=build /usr/src/app/src/generated ./src/generated

# EXPOSE 3000

# HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
#   CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# CMD ["node", "dist/main"]
# ─── Development image ────────────────────────────────────────
FROM node:22-alpine AS dev

WORKDIR /usr/src/app

# COPY .npmrc ./
COPY package.json package-lock.json ./
RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci
# RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci --registry=https://package-mirror.liara.ir/repository/npm/

# COPY node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]


# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# COPY .npmrc ./
COPY package.json package-lock.json ./
RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci
# RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci --registry=https://package-mirror.liara.ir/repository/npm/

# COPY node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY . .

RUN npm run build


# ─── Production image ─────────────────────────────────────────
FROM node:22-alpine AS prod

WORKDIR /usr/src/app

ENV NODE_ENV=production

# COPY .npmrc ./
COPY package.json package-lock.json ./
RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci --omit=dev
# RUN export PUPPETEER_SKIP_DOWNLOAD=true && npm ci --registry=https://package-mirror.liara.ir/repository/npm/ --omit=dev

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/src/generated ./src/generated

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main"]

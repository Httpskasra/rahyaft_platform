# # ─── Development image ────────────────────────────────────────
# FROM node:22-alpine AS dev

# WORKDIR /usr/src/app

# COPY .yarnrc ./
# COPY package.json yarn.lock ./
# RUN yarn install --frozen-lockfile
# # RUN yarn config set registry https://mirror-npm.runflare.com && yarn install --frozen-lockfile

# COPY . .

# EXPOSE 3001

# CMD ["yarn", "dev", "--port", "3001"]


# # ─── Build stage ──────────────────────────────────────────────
# FROM node:22-alpine AS build

# WORKDIR /usr/src/app

# COPY .yarnrc ./
# COPY package.json yarn.lock ./
# RUN  yarn install --frozen-lockfile

# COPY . .

# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# RUN yarn build


# # ─── Production image ─────────────────────────────────────────
# FROM node:22-alpine AS prod

# WORKDIR /usr/src/app

# ENV NODE_ENV=production

# COPY --from=build /usr/src/app/.next/standalone ./
# COPY --from=build /usr/src/app/.next/static ./.next/static
# COPY --from=build /usr/src/app/public ./public

# EXPOSE 3001

# HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
#   CMD wget -qO- http://localhost:3001 || exit 1

# CMD ["node", "server.js"]
# ─── Development image ────────────────────────────────────────
FROM node:22-alpine AS dev

WORKDIR /usr/src/app

# COPY .npmrc ./
COPY package.json package-lock.json ./
RUN npm ci 
# RUN npm ci --registry=https://package-mirror.liara.ir/repository/npm/

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--port", "3001"]


# ─── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build    

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
FROM node:22-alpine AS prod

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=build /usr/src/app/.next/standalone ./
COPY --from=build /usr/src/app/.next/static ./.next/static
COPY --from=build /usr/src/app/public ./public

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001 || exit 1

CMD ["node", "server.js"]
# FROM node:20-alpine  AS dev

# # Create /usr/src/app inside the container
# WORKDIR /usr/src/app

# # Install deps
# COPY package*.json ./
# RUN npm ci

# # Copy the source (you can later mount this as a volume)
# # COPY . .

# # Tell Next.js we’re in dev mode
# ENV NODE_ENV=development

# # Expose the dev server port
# EXPOSE 3001

# # Start the dev server
# CMD ["npm", "run", "dev"]
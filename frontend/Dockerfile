# syntax=docker/dockerfile:1.7
FROM node:22-slim AS dependencies
WORKDIR /usr/src/app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS dev
COPY . .
EXPOSE 3001
CMD ["pnpm", "run", "dev", "--port", "3001"]

FROM dependencies AS build
COPY . .
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:22-slim AS prod
WORKDIR /usr/src/app
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /usr/src/app/.next/standalone ./
COPY --from=build --chown=node:node /usr/src/app/.next/static ./.next/static
COPY --from=build --chown=node:node /usr/src/app/public ./public
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "server.js"]

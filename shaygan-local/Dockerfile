FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY . .
EXPOSE 4310
CMD ["pnpm", "start"]

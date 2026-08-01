# Docker setup

## Architecture

The project runs these independent processes:

- `backend`: NestJS API and RabbitMQ event publisher
- `frontend`: Next.js dashboard
- `form-analytics-worker`: consumes `form_submissions`
- `crm-ai-worker`: consumes `customer.#` from `domain_events`
- `ollama`: local LLM used only by the CRM AI worker
- PostgreSQL, Redis and RabbitMQ

The two Python workers must not be merged into one container process. They consume different exchanges and have different failure/restart lifecycles.

## Development

```bash
cp .env.development.example .env.development
docker compose --env-file .env.development -f docker-compose.dev.yml up -d --build
```

Useful URLs:

- Frontend: `http://localhost:3001`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- RabbitMQ management: `http://localhost:15672`
- Ollama: `http://localhost:11434`

Backend, frontend and both Python workers use source mounts. NestJS, Next.js and Python workers restart when source files change.

## Production

```bash
cp .env.production.example .env.production
# Replace every placeholder before running.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Production behavior:

- Prisma migrations run once in the `migrate` service before the API starts.
- PostgreSQL, Redis, RabbitMQ and Ollama are only attached to the internal Docker network.
- Backend and frontend bind to `127.0.0.1` and should be exposed through Nginx, Caddy or a named Cloudflare Tunnel.
- Swagger is disabled by default.
- Source code is not mounted.
- Application containers run as non-root where practical.

## Logs

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml logs -f backend
docker compose --env-file .env.development -f docker-compose.dev.yml logs -f crm-ai-worker
docker compose --env-file .env.development -f docker-compose.dev.yml logs -f form-analytics-worker
```

## Rebuild one service

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml up -d --build backend
docker compose --env-file .env.development -f docker-compose.dev.yml up -d --build crm-ai-worker
```

## Ollama model

The `ollama-init` one-shot service pulls `OLLAMA_MODEL`. The first startup can download several gigabytes. To change the model, update `OLLAMA_MODEL` in the environment file and run:

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml run --rm ollama-init
```

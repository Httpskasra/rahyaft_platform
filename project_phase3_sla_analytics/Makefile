COMPOSE_DEV=docker compose --env-file .env.development -f docker-compose.dev.yml
COMPOSE_PROD=docker compose --env-file .env.production -f docker-compose.prod.yml

.PHONY: dev dev-build prod prod-build down down-prod logs ps migrate seed pull-model

dev:
	$(COMPOSE_DEV) up -d

dev-build:
	$(COMPOSE_DEV) up -d --build

prod:
	$(COMPOSE_PROD) up -d

prod-build:
	$(COMPOSE_PROD) up -d --build

down:
	$(COMPOSE_DEV) down

down-prod:
	$(COMPOSE_PROD) down

logs:
	$(COMPOSE_DEV) logs -f

ps:
	$(COMPOSE_DEV) ps

migrate:
	$(COMPOSE_DEV) exec backend npx prisma migrate deploy

seed:
	$(COMPOSE_DEV) exec backend npx tsx prisma/seed.ts

pull-model:
	$(COMPOSE_DEV) run --rm ollama-init

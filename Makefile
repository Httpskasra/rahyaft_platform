COMPOSE_DEV=docker compose --env-file .env -f docker-compose.dev.yml
COMPOSE_PROD=docker compose --env-file .env.test --env-file .release.env -f docker-compose.test.yml
.PHONY: dev prod pull logs ps migrate seed
dev:
	$(COMPOSE_DEV) up -d
prod:
	$(COMPOSE_PROD) up -d --no-build --wait
pull:
	$(COMPOSE_PROD) pull
logs:
	$(COMPOSE_PROD) logs -f
ps:
	$(COMPOSE_PROD) ps -a
migrate:
	$(COMPOSE_PROD) run --rm migrate
seed:
	$(COMPOSE_PROD) run --rm migrate pnpm exec prisma db seed

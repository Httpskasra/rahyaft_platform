# ─── Enterprise Platform — Dev & Prod commands ───────────────

.PHONY: dev prod down logs migrate seed

## Start development environment (hot-reload)
dev:
# 	docker compose -f docker-compose.dev.yml up --build
# 	docker compose -f docker-compose.dev.yml build --no-cache
	docker compose -f docker-compose.dev.yml up -d         

## Start production environment
prod:
	docker compose -f docker-compose.prod.yml up --build -d

## Stop all services
down:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.prod.yml down 2>/dev/null || true

## Follow logs
logs:
	docker compose -f docker-compose.dev.yml logs -f

## Run Prisma migrations inside the running backend container
migrate:
	docker compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy

## Run seed inside the running backend container
seed:
	docker compose -f docker-compose.dev.yml exec backend npx tsx prisma/seed.ts

## Open RabbitMQ management UI
rabbitmq-ui:
	open http://localhost:15672

## Open backend API
api:
	open http://localhost:3000/api/v1

## Open frontend
app:
	open http://localhost:3001


docker logs cloudflared | grep trycloudflare

curl -X POST "https://tapi.bale.ai/bot205553143:ZX0KlvSNqF7sjqlMXl9-UuxdpozEqGQQQ-0/setWebhook" -d '{"url": "https://pond-coordinator-profession-present.trycloudflare.com"  /api/v1/bale/webhook"}'
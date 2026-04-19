Ran 3 commandsRan 3 commandsNow let's create the frontend forms pages and analytics dashboard:Ran 10 commandsRan 10 commandsEverything is in place. Now let's package it all up:Ran a command, read a fileRan a command, read a fileHere's the complete project. Here's everything that was done:

What was built
1. Docker Compose (Dev + Prod)
docker-compose.dev.yml — Hot-reload for everything:

PostgreSQL 16 + health checks
Redis 7 (OTP/rate-limit)
RabbitMQ 3.13 with Management UI at :15672
NestJS backend with volume mount (watch mode)
Next.js frontend with volume mount
Python analytics worker with volume mount

docker-compose.prod.yml — Production-hardened:

Multi-stage Docker builds, no source mounts
Redis with password, RabbitMQ without management plugin
Memory limits on analytics worker
Health checks on every service

2. Backend (NestJS) — New modules added
ModuleEndpointDescriptionRabbitMQModule—Global, graceful-degradation publisher. If RabbitMQ is down, forms still saveFormsModuleGET/POST/PATCH/DELETE /api/v1/formsSchema-driven form CRUDFormsModuleGET /api/v1/forms/:id/statsLive stats + AI analysis per formFormSubmissionsModulePOST /api/v1/form-submissionsSubmit → saves + publishes to RabbitMQ
Prisma schema extended with: Form, FormSubmission, FormStat, FormAnalysis + migration SQL.
3. Analytics Worker (Python) — 5 analysis types
Every submission triggers all of these asynchronously:
AnalysisWhat it doesStored inRolling statscount, avg, min, max, std per numeric fieldFormStatNLP analysissentiment (pos/neg/neutral), keywords, summary, word count per text fieldFormAnalysisRisk scoringmissing required fields, negative numbers, very short required text → score 0–100 + reasonsFormAnalysisAnomaly detectionZ-score per numeric field vs historical baseline, flags z > 3FormAnalysisForm categoryquantitative / qualitative / mixed based on field compositionFormAnalysis
4. Frontend (Next.js) — New pages

/dashboard/forms — List all forms, stats bar, create-form modal with field builder
/dashboard/forms/:id — Live analytics dashboard showing risk badge, anomaly alerts, NLP insights, field stats table + a submit panel to test forms
Sidebar — "فرم‌ها" nav item added

Quick start
bashcp .env.example .env
make dev          # starts everything
make migrate      # run DB migrations (first time)














Since you're using Docker, here are the commands to wipe everything and rebuild fresh using the mirror:

## 1. Stop and remove everything
```bash
# Stop all running containers
docker compose -f docker-compose.dev.yml down

# Remove containers, networks, and volumes
docker compose -f docker-compose.dev.yml down -v --remove-orphans
```

## 2. Remove cached images and build cache
```bash
# Remove all unused images (including your project images)
docker image prune -a

# Clear the Docker build cache (most important for yarn layer caching)
docker builder prune -a

# Or do everything in one shot
docker system prune -a --volumes
```

> ⚠️ `docker system prune -a --volumes` removes **all** unused containers, images, volumes, and build cache on your machine — not just this project. Skip `--volumes` if you want to keep DB data etc.

## 3. Rebuild from scratch
```bash
# Dev
docker compose -f docker-compose.dev.yml build --no-cache

# Then start
docker compose -f docker-compose.dev.yml up
```

Or in one command:
```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## Quick cheatsheet

| Goal | Command |
|------|---------|
| Stop containers | `docker compose down` |
| Wipe volumes too | `docker compose down -v` |
| Clear build cache only | `docker builder prune -a` |
| Clear everything | `docker system prune -a --volumes` |
| Rebuild no cache | `docker compose build --no-cache` |

The key flag is `--no-cache` on the build — this forces Docker to re-run every layer including `yarn install`, which will now pull packages from your mirror.
# Phase 1 — Test deployment with Docker (IP only)

This phase intentionally excludes Cloudflare Tunnel, custom domain, CI/CD, Bale webhook init, and Ollama.

## Services

- postgres
- redis
- rabbitmq
- migrate (one-shot Prisma migration)
- backend (NestJS, port 3000)
- frontend (Next.js, port 3001)
- crm-ai-worker (AvalAI)

## 1. Server prerequisites

Ubuntu 22.04/24.04 recommended.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git unzip
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
docker --version
docker compose version
```

## 2. Upload/copy project

Example destination:

```bash
sudo mkdir -p /opt/enterprise
sudo chown -R $USER:$USER /opt/enterprise
cd /opt/enterprise
```

Copy the project contents here (or clone from Git later).

## 3. Create test env

```bash
cp .env.test.example .env.test
nano .env.test
```

Replace `SERVER_IP` with the public IPv4 of the server and replace every `CHANGE_ME...` value.

Generate strong secrets if needed:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Important IP-phase values:

```env
NEXT_PUBLIC_API_URL=http://SERVER_IP:3000/api/v1
FRONTEND_URL=http://SERVER_IP:3001
PUBLIC_API_URL=http://SERVER_IP:3000
```

## 4. Validate resolved Compose configuration

```bash
docker compose --env-file .env.test -f docker-compose.test.yml config
```

Do not continue if this prints an error.

## 5. Build

```bash
docker compose --env-file .env.test -f docker-compose.test.yml build --pull
```

## 6. Start

```bash
docker compose --env-file .env.test -f docker-compose.test.yml up -d
```

## 7. Check containers

```bash
docker compose --env-file .env.test -f docker-compose.test.yml ps
```

`migrate` should finish with exit code 0. Backend and frontend should become healthy.

## 8. Inspect logs

```bash
docker compose --env-file .env.test -f docker-compose.test.yml logs --tail=200
```

Backend only:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml logs -f backend
```

Frontend only:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml logs -f frontend
```

Migration:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml logs migrate
```

AI worker:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml logs -f crm-ai-worker
```

## 9. Firewall for test phase

If UFW is enabled:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
sudo ufw status
```

These two app ports are temporary. In the domain/Cloudflare phase they should no longer be publicly exposed.

## 10. Test URLs

Backend health:

```bash
curl -i http://SERVER_IP:3000/api/v1/health
```

Frontend:

```text
http://SERVER_IP:3001
```

API base:

```text
http://SERVER_IP:3000/api/v1
```

## 11. Stop/restart

Restart:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml restart
```

Stop containers (keeps volumes/data):

```bash
docker compose --env-file .env.test -f docker-compose.test.yml down
```

Do NOT add `-v` unless you intentionally want to delete the test database and persistent data.

## Success criteria before Phase 2

1. `docker compose ps` shows backend/frontend healthy.
2. `migrate` exited 0.
3. `/api/v1/health` returns HTTP 200.
4. Frontend opens on port 3001.
5. Login/API requests from frontend work without CORS errors.
6. `crm-ai-worker` stays running and can reach AvalAI when an AI event is generated.

Only after these pass, proceed to Phase 2: Cloudflare temporary/custom domain + HTTPS/proxy. Phase 3 will be Git-based CI/CD.

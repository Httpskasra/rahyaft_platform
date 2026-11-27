# Phase 2 — Nginx + Cloudflare test

Use the same origin for frontend, API, and WebSocket:

- `/` -> frontend:3001
- `/api/*` -> backend:3000
- `/communication-ws` -> backend:3000 with WebSocket upgrade
- host port `8080` -> nginx:80

Set in `.env.production`:

```env
NEXT_PUBLIC_API_URL=/api/v1
NGINX_PORT=8080
```

Then rebuild frontend and start nginx:

```bash
docker compose --env-file .env.production -f docker-compose.test.yml up -d --build frontend nginx
```

Test locally:

```bash
curl -I http://localhost:8080
curl -i http://localhost:8080/api/v1/health
```

Once both work, point Cloudflare Quick Tunnel at Nginx only:

```bash
cloudflared tunnel --url http://localhost:8080 --protocol http2
```

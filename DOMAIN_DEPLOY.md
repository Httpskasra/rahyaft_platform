# Domain + HTTPS deployment (before CI/CD)

Public IP: `94.183.90.221`
Domain: `httpskasra.ir`

## 1. DNS
Create an A record for `@` pointing to `94.183.90.221`.
Optional: create `www` as a CNAME to `httpskasra.ir`. Only request a certificate for `www` after that record resolves publicly.

## 2. Environment
Copy `.env.test.example` to `.env.production` and fill every `CHANGE_ME` value.
Keep:

```env
NEXT_PUBLIC_API_URL=/api/v1
FRONTEND_URL=http://httpskasra.ir
PUBLIC_API_URL=http://httpskasra.ir
NGINX_CONFIG_FILE=nginx.http.conf
```

## 3. Initial HTTP deployment

```bash
mkdir -p certbot/www certbot/conf
docker compose --env-file .env.production -f docker-compose.test.yml config
docker compose --env-file .env.production -f docker-compose.test.yml up -d --build
```

Verify:

```bash
curl -I http://127.0.0.1:80/login
curl -i http://127.0.0.1:80/api/v1/health
curl -I http://httpskasra.ir/login
```

## 4. Verify ACME webroot before requesting the certificate

```bash
mkdir -p certbot/www/.well-known/acme-challenge
echo acme-ok > certbot/www/.well-known/acme-challenge/test
curl http://httpskasra.ir/.well-known/acme-challenge/test
```

It must return `acme-ok` from outside the company network too.

## 5. Issue the certificate

Replace the email below:

```bash
docker compose --env-file .env.production -f docker-compose.test.yml --profile certbot run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  --email YOUR_EMAIL@example.com \
  --agree-tos --no-eff-email \
  -d httpskasra.ir
```

If `www.httpskasra.ir` also points to the same server, use both `-d` values.

## 6. Enable HTTPS

Change in `.env.production`:

```env
FRONTEND_URL=https://httpskasra.ir
PUBLIC_API_URL=https://httpskasra.ir
NGINX_CONFIG_FILE=nginx.https.conf
```

Then recreate Backend and Nginx (Frontend does not need a rebuild because its API URL stays relative):

```bash
docker compose --env-file .env.production -f docker-compose.test.yml up -d --force-recreate backend nginx
```

Verify:

```bash
curl -I https://httpskasra.ir/login
curl -i https://httpskasra.ir/api/v1/health
```

## 7. Certificate renewal test

```bash
docker compose --env-file .env.production -f docker-compose.test.yml --profile certbot run --rm certbot renew --dry-run
```

For now renewal can be run manually. CI/CD/systemd automation should be added after the application is fully verified.

## 8. Security after domain works

Backend/frontend are not published to host ports in this compose. Only Nginx is public.
After validation, ask the network administrator to close external access to ports 3000 and 3001. Keep 80/443 open. Port 8080 is only transitional and can also be closed later.

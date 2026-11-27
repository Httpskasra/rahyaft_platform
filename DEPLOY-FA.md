# استقرار httpskasra.ir

1. رکورد A برای `@` و `www` را به IP عمومی سرور/VM بفرستید؛ هر دو Proxied (نارنجی).
2. در Cloudflare > SSL/TLS > Origin Server یک Origin Certificate با hostnames `httpskasra.ir` و `*.httpskasra.ir` بسازید. گواهی را در `certs/origin.pem` و Private Key را در `certs/origin.key` کپی کنید (chmod 600 certs/origin.key). این کلید را به Git نفرستید.
3. روی Cloudflare، SSL/TLS mode را **Full (strict)** کنید و Always Use HTTPS را فعال کنید.
4. `cp .env.production.example .env.production` و رمزها/توکن‌ها را تنظیم کنید (ترجیحاً alphanumeric برای رمز دیتابیس/RabbitMQ تا URL encoding نیاز نباشد).
5. `docker compose --env-file .env.production -f docker-compose.test.yml config -q`
6. `docker compose --env-file .env.production -f docker-compose.test.yml up -d --build`
7. `docker compose --env-file .env.production -f docker-compose.test.yml ps`
8. تست: `curl -I https://www.httpskasra.ir` و `curl https://www.httpskasra.ir/api/v1/health`
9. webhook: `curl -sS -X POST "https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/setWebhook" --data-urlencode "url=https://www.httpskasra.ir/api/v1/bale/webhook"` (پس از export کردن BALE_BOT_TOKEN در shell).
10. بررسی webhook: `curl -sS "https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/getWebhookInfo"`.

هشدار: این نسخه نام پروژه Compose را `enterprise-test` و volumeهای قبلی را حفظ می‌کند. `down -v` نزنید. پیش از تغییر روی سرور از volumeها بکاپ بگیرید. اگر پورت 80/443/8080 توسط کانتینر دیگری استفاده می‌شود ابتدا تعارض را با `sudo ss -lntp` بررسی کنید. فایل Origin CA در اتصال مستقیم مرورگر به IP قابل اعتماد نیست و نیاز به پروکسی Cloudflare دارد.

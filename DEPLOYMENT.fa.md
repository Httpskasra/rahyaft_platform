# راهنمای CI/CD پروژه Enterprise

Production اصلی این راهنما `docker-compose.test.yml` است و نام Compose همان `enterprise-test` قبلی باقی مانده است. چهار ایمیج برنامه و چهار ایمیج زیرساخت روی GitHub ساخته یا Mirror می‌شوند و سرور فقط از GHCR دریافت می‌کند. مسیر نمونه `/opt/enterprise` و معماری `linux/amd64` است. اگر پروژه فعلی در مسیر دیگری است، همان مسیر فعلی را به‌کار ببرید تا فایل‌های TLS و محیط حفظ شوند.

## ۱. ویندوز — یک بار قبل از Push

Node.js 22 و Git را نصب کنید. در PowerShell داخل ریشه پروژه:

```powershell
npm install -g pnpm@10.15.1
pnpm --version
powershell -ExecutionPolicy Bypass -File .\scripts\init-pnpm.ps1
```

در خروجی باید `backend/pnpm-lock.yaml` و `frontend/pnpm-lock.yaml` ساخته شوند. فایل‌های package-lock قدیمی برای `pnpm import` نگه داشته شده‌اند؛ پس از موفقیت و بررسی دو lockfile جدید می‌توانید هر دو package-lock.json را حذف کنید. اگر فایل‌های node_modules قدیمی با npm ساخته شده‌اند، قبل از اجرای اسکریپت آن‌ها را حذف کنید. هیچ فایل `.env.test`، کلید خصوصی یا گواهی TLS واقعی را commit نکنید. اسکریپت به شبکه npm نیاز دارد.

برای توسعه محلی، در صورت نیاز `.env.example` را به `.env` کپی و تنظیم کنید، سرویس‌های زیرساخت را با Compose توسعه اجرا کنید و `backend/.env` را از مثال خودش تنظیم کنید:

```powershell
docker compose --env-file .env -f docker-compose.dev.yml up -d
cd backend
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm run start:dev
```

در ترمینال جداگانه از ریشه:

```powershell
cd frontend
pnpm dev --port 3001
```

برای Build محلی در صورت نیاز، در هر پوشه `pnpm run build`؛ ابتدا در backend دستور generate را اجرا کنید. برای فرانت، متغیر NEXT_PUBLIC_API_URL را متناسب با API محلی تنظیم کنید. در Production مقدار build-time همیشه `/api/v1` است.

## ۲. GitHub — قبل از اولین Push به main

Repository خصوصی بسازید یا از Repository فعلی استفاده کنید. در Settings > Environments محیط `production` را ایجاد کنید. در Environment secrets این مقادیر را تنظیم کنید:

| Secret | مقدار |
|---|---|
| SSH_HOST | IP عمومی یا hostname قابل دسترس سرور |
| SSH_USER | کاربر SSH دارای دسترسی Docker و مسیر پروژه |
| SSH_PORT | مثلاً 22 |
| SSH_PRIVATE_KEY | متن کامل کلید خصوصی اختصاصی Deploy |
| SSH_KNOWN_HOSTS | خط کامل کلید میزبان تایید شده سرور |

در Environment variables مقدار `DEPLOY_PATH` را مثل `/opt/enterprise` تعیین کنید. Environment نباید برای Deploy خودکار نیاز به تایید دستی داشته باشد مگر عمداً آن را بخواهید. Workflow برای publish از `GITHUB_TOKEN` داخلی با `packages: write` استفاده می‌کند. برای Packageهای از قبل موجود، در تنظیمات Package دسترسی Actions repository را بررسی کنید.

## ۳. Ubuntu — آماده‌سازی یک‌باره

Docker Engine و Docker Compose v2 جدید نصب باشند. کاربر SSH باید بتواند Docker را بدون sudo اجرا کند؛ عضویت گروه docker عملاً دسترسی سطح root می‌دهد. روی سرور:

```bash
uname -m
docker version
docker compose version
mkdir -p /opt/enterprise/nginx /opt/enterprise/certs
cd /opt/enterprise
```

اگر سرور موجود است نام پروژه و مسیر قبلی را عوض نکنید. در صورت نیاز ادمین مسیر را با `sudo mkdir -p /opt/enterprise` بسازد و مالکیت آن را به کاربر deploy بدهد. فایل `.env.test` موجود را حفظ کنید. برای نصب تازه فایل `.env.test.example` را با SCP منتقل کنید، آن را به `.env.test` تبدیل کنید و همه مقادیر واقعی را تنظیم کنید. مقدار `NEXT_PUBLIC_API_URL=/api/v1` باشد و FRONTEND_URL/PUBLIC_API_URL با HTTPS دامنه واقعی هماهنگ باشند. در رمزهای PostgreSQL و RabbitMQ که مستقیماً وارد URL می‌شوند از نویسه‌های URL-safe استفاده کنید (یا URL را به‌درستی encode کنید). فایل‌های `certs/origin.pem` و `certs/origin.key` باید از قبل موجود و معتبر باشند؛ تنظیم Nginx فعلی مربوط به httpskasra.ir است. برای دامنه دیگر فایل Nginx را قبل از Push اصلاح کنید.

برای کلید SSH روی ویندوز:

```powershell
ssh-keygen -t ed25519 -f "$HOME/.ssh/enterprise_deploy" -C "github-enterprise-deploy"
Get-Content "$HOME/.ssh/enterprise_deploy.pub" | ssh USER@SERVER "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
ssh -i "$HOME/.ssh/enterprise_deploy" USER@SERVER
ssh-keyscan -p 22 SERVER
```

برای این Workflow کلید اختصاصی Deploy بدون passphrase لازم است (در پرسش ssh-keygen Enter بزنید). مقدار فایل بدون `.pub` را در SSH_PRIVATE_KEY بگذارید. خروجی ssh-keyscan را با اثرانگشت واقعی میزبان که از کنسول مطمئن سرور به دست می‌آید مقایسه و فقط پس از تایید در SSH_KNOWN_HOSTS قرار دهید. روی سرور `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` برای اثرانگشت ED25519. برای پورت غیر 22 در دستورهای SSH و keyscan پورت را تغییر دهید. کلید خصوصی را هرگز در repo قرار ندهید.

برای Pull از GHCR خصوصی، در GitHub Settings > Developer settings > Personal access tokens > Tokens (classic) یک token با `read:packages` بسازید؛ صاحب token باید به Packageها دسترسی داشته باشد و در سازمان‌های SSO مجوز لازم را داشته باشد. به همان کاربری که Workflow با SSH وارد می‌شود وارد شوید:

```bash
read -rsp 'GHCR token: ' GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
unset GHCR_TOKEN
chmod 600 .env.test certs/origin.key
```

اگر GHCR از سرور مسدود است، این معماری به‌تنهایی کافی نیست؛ ابتدا دسترسی رجیستری را حل کنید. GitHub runner هم باید به SSH سرور دسترسی داشته باشد. با `curl -I https://ghcr.io/v2/` می‌توانید اتصال TLS را بررسی کنید؛ پاسخ 401 بدون احراز هویت طبیعی است.

برای حفظ اطلاعات نسخه قبلی، پیش از اولین Deploy بکاپ دیتابیس و فایل‌های آپلود/گواهی بگیرید. در نصب موجود قبل از جایگزینی Compose قدیمی:

```bash
cd /opt/enterprise
mkdir -p backups
chmod 700 backups
umask 077
docker compose --env-file .env.test -f docker-compose.test.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/db-$(date +%F-%H%M%S).sql"
```

هیچ‌وقت برای Deploy معمولی `docker compose down -v` یا `docker volume prune` اجرا نکنید.

## ۴. اولین Push

در ویندوز، اگر Repository از قبل Git دارد، فقط فایل‌های نسخه جدید را روی آن جایگزین کنید و Git remote را حفظ کنید. برای پروژه تازه:

```powershell
git init
git branch -M main
git remote add origin https://github.com/OWNER/REPO.git
```

در هر دو حالت:

```powershell
git status --short
git add .
git diff --cached --stat
git commit -m "Configure pnpm and GHCR production CI/CD"
git push -u origin main
```

حتماً بررسی کنید هر دو `pnpm-lock.yaml` و `.github/workflows/production.yml` ثبت شده‌اند. پس از Push در Actions گردش‌کار Build and deploy production را باز کنید. چهار Build به‌صورت موازی و Mirror جداگانه اجرا می‌شوند. فقط اگر همه موفق باشند Deploy آغاز می‌شود. از Actions > Run workflow نیز می‌توانید به‌صورت دستی اجرا کنید.

## ۵. روی سرور پس از موفقیت Deploy

```bash
cd /opt/enterprise
docker compose --env-file .env.test --env-file .release.env -f docker-compose.test.yml ps -a
docker compose --env-file .env.test --env-file .release.env -f docker-compose.test.yml logs --tail=100 backend frontend crm-ai-worker nginx
curl -fsS http://127.0.0.1/healthz
```

کانتینر migrate باید با کد 0 خاتمه یابد (طبیعی است). در صورت نیاز به seed و فقط با اطلاع از رفتار seed روی داده‌های واقعی:

```bash
docker compose --env-file .env.test --env-file .release.env -f docker-compose.test.yml run --rm migrate pnpm exec prisma db seed
```

اگر Deploy شکست خورد و فایل `.release.pending.env` موجود بود، برای دیدن سرویس‌های همان Release از آن به‌جای `.release.env` استفاده کنید. روی سرور فایل‌های `.env.test` و `certs` هیچ‌وقت توسط Workflow جایگزین نمی‌شوند. فایل `.release.env` فقط پس از health check موفق تغییر می‌کند. `.release.previous.env` و `.previous/` برای نسخه موفق قبلی نگه داشته می‌شوند. برای Rollback پس از بررسی سازگاری دیتابیس، فایل‌های Compose و Nginx قبلی را بازگردانید و از `.release.previous.env` استفاده کنید:

```bash
cp .previous/docker-compose.test.yml docker-compose.test.yml
cp .previous/nginx/nginx.httpskasra.conf nginx/nginx.httpskasra.conf
docker compose --env-file .env.test --env-file .release.previous.env -f docker-compose.test.yml pull
docker compose --env-file .env.test --env-file .release.previous.env -f docker-compose.test.yml up -d --no-build --wait
docker compose --env-file .env.test --env-file .release.previous.env -f docker-compose.test.yml exec -T nginx nginx -s reload
cp .release.previous.env .release.env
rm -f .release.pending.env
```

Rollback خودکار دیتابیس انجام نمی‌شود؛ migration ممکن است با نسخه قدیمی سازگار نباشد. در این صورت به بکاپ و برنامه بازیابی نیاز دارید. برای اولین مهاجرت از نسخه قدیمی که GHCR نداشته، بکاپ دستی فایل‌های Compose/Nginx قبلی نیز ضروری است. بعد از اطمینان از پایداری نسخه، `docker image prune` فقط برای ایمیج‌های dangling قابل استفاده است؛ نسخه‌های مورد نیاز Rollback را حذف نکنید. این راهکار بدون Build سرور است اما تضمین Zero Downtime نیست؛ در زمان جایگزینی کانتینرها وقفه کوتاه ممکن است رخ دهد.

## وضعیت اعتبارسنجی

فایل‌های YAML و نحو Bash بررسی شده‌اند. محیط تهیه این نسخه Docker و دسترسی npm registry ندارد؛ بنابراین ساخت lockfile واقعی، Build، آزمون برنامه و Deploy واقعی در اینجا اجرا نشده‌اند. Workflow تا زمانی که هر دو lockfile تولید و commit نشوند عمداً متوقف خواهد شد. هیچ فایل منطق تجاری تغییر نکرده است. pnpm به‌صورت دو پروژه مستقل (نه workspace) استفاده می‌شود تا context مستقل هر Dockerfile حفظ شود. نسخه‌های زیرساخت از Compose موجود حفظ شده‌اند؛ ارتقای امنیتی وابستگی‌ها جداگانه لازم است.

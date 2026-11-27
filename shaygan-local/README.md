# Shaygan local contract capture and mock

این پروژه مستقل، قرارداد مستند وب‌سرویس حسابداری شایگان را بدون تغییر backend/frontend اصلی نگه می‌دارد. در وضعیت فعلی تمام رفتارها `documented-only` یا `synthetic` هستند و هنوز هیچ endpoint زنده‌ای تأیید نشده است.

## راه‌اندازی mock

```powershell
pnpm install
pnpm artifacts:generate
pnpm test
pnpm start
```

Swagger در `http://127.0.0.1:4310/docs` و OpenAPI پویا در `http://127.0.0.1:4310/openapi.json` است. سرور فقط روی loopback bind می‌شود.

Modeها با `SHAYGAN_MOCK_MODE` تعیین می‌شوند:

- `synthetic`: خروجی غیرواقعی و صریحاً علامت‌گذاری‌شده؛ پیش‌فرض.
- `stateful`: عملیات Put فقط داخل حافظه mock اعمال می‌شود.
- `replay`: فعلاً تا زمان capture واقعی به synthetic fallback می‌کند؛ بعد از capture باید fixtureهای sanitized به آن متصل شوند.

## capture روی شبکه داخلی

فایل `.env.local` محلی و gitignored است. روی شبکه داخلی از همین پوشه اجرا کنید:

```powershell
pnpm shaygan:lan
```

اگر هنگام حضور روی LAN دسترسی registry ندارید، dependencyها را قبل از قطع اینترنت با `pnpm install --frozen-lockfile` نصب کنید. خود اسکریپت LAN بعد از آن مستقیماً از binary محلی استفاده می‌کند و دانلودی انجام نمی‌دهد. اجرای مستقیم نیز ممکن است:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-lan-capture.ps1
```

اسکریپت ابتدا یک probe کم‌حجم، سپس همه ۱۹ endpoint خواندنی و در پایان verify را اجرا می‌کند. خطای یک endpoint مانع ثبت بقیه نمی‌شود. خروجی sanitized هر اجرا در `captures/runs/<timestamp>/` و مسیر آخرین اجرا در `captures/latest-run.txt` ذخیره می‌شود. پاسخ خام ذخیره نمی‌شود؛ فقط hash آن نگه داشته می‌شود.

هیچ endpoint نوشتنی در capture زنده فراخوانی نمی‌شود و حتی با `SHAYGAN_ALLOW_WRITE_TESTS=true`، CLI به‌طور ایمن متوقف می‌شود.

## Docker

```powershell
docker compose up --build
```

Port mapping نیز فقط روی `127.0.0.1:4310` است.

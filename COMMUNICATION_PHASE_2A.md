# Communication Phase 2A — Realtime Core

این فاز روی Phase 1.5 ساخته شده و شامل موارد زیر است:

- WebSocket استاندارد روی `/communication-ws`
- احراز هویت WebSocket با access token در اولین frame (توکن در URL قرار نمی‌گیرد)
- بستن اتصال WebSocket در زمان انقضای JWT و reconnect پس از refresh token
- Room منطقی برای User و Thread
- Realtime message delivery
- Realtime thread metadata changes
- Realtime inbox/unread synchronization
- Optimistic message UI
- وضعیت sending / sent / failed
- Retry پیام ناموفق
- Idempotent retry با `ThreadMessage.clientId`
- Reply واقعی با `replyToId` و Foreign Key
- Enter برای ارسال و Shift+Enter برای خط جدید

## معماری نوشتن داده

WebSocket مسیر ثبت داده نیست. همه mutationها همچنان از REST انجام می‌شوند:

Frontend -> REST -> NestJS -> PostgreSQL -> realtime event -> WebSocket clients

این تصمیم برای audit، permission، retry و consistency است.

## Migration جدید

`backend/prisma/migrations/20260828000200_communication_phase_2a_reply/migration.sql`

ستون‌های جدید:

- `ThreadMessage.clientId`
- `ThreadMessage.replyToId`

و unique key زیر برای idempotency:

`@@unique([senderId, clientId])`

## تست 1 — build و migration

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml up -d --build
```

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml logs -f backend
```

نباید Prisma migration یا Nest build error داشته باشید.

## تست 2 — اتصال realtime

با یک کاربر وارد `/dashboard/communications` شوید.

بالای صفحه باید نشان داده شود:

`لحظه‌ای`

اگر «در حال اتصال» باقی ماند، DevTools > Network > WS را بررسی کنید. باید اتصال به:

`ws://localhost:3000/communication-ws`

در Development وجود داشته باشد.

## تست 3 — دو کاربر بدون Refresh

دو مرورگر یا Incognito باز کنید:

- Browser A = User A
- Browser B = User B

هر دو یک Thread مشترک را باز کنند.

User A پیام بفرستد. پیام باید بدون Refresh در Browser B ظاهر شود.

## تست 4 — realtime inbox/unread

Browser B روی Thread دیگری باشد یا Thread را باز نکرده باشد.

User A در Thread مشترک پیام ارسال کند.

Browser B باید بدون Refresh:

- Thread را در لیست به‌روز ببیند
- unread را ببیند
- شمارنده Inbox به‌روز شود

وقتی Browser B Thread را باز کند unread باید پاک شود.

## تست 5 — optimistic UI

در DevTools شبکه را Slow 3G کنید و پیام بفرستید.

قبل از پاسخ HTTP، پیام باید فوراً در UI دیده شود با متن:

`در حال ارسال…`

بعد از موفقیت وضعیت ارسال حذف می‌شود.

## تست 6 — failed + retry

Backend را موقتاً متوقف کنید و پیام بفرستید.

پیام نباید از UI حذف شود و باید:

`تلاش مجدد`

نشان دهد.

Backend را بالا بیاورید و «تلاش مجدد» را بزنید.

پیام باید فقط یک بار در DB ذخیره شود.

برای بررسی idempotency:

```sql
SELECT "senderId", "clientId", COUNT(*)
FROM "ThreadMessage"
WHERE "clientId" IS NOT NULL
GROUP BY "senderId", "clientId"
HAVING COUNT(*) > 1;
```

خروجی باید صفر ردیف باشد.

## تست 7 — Reply

روی آیکن Reply یک پیام کلیک کنید.

بالای composer باید پیام مرجع دیده شود.

پاسخ را ارسال کنید. پس از Refresh نیز quote پیام اصلی باید باقی مانده باشد.

DB:

```sql
SELECT id, "replyToId", body
FROM "ThreadMessage"
WHERE "replyToId" IS NOT NULL
ORDER BY "createdAt" DESC;
```

## تست 8 — Reply امنیتی

با API تلاش کنید روی پیام Thread A، در Thread B reply ایجاد کنید.

Backend باید `404 Reply target message not found in this thread` بدهد.

## تست 9 — Permission WebSocket

کاربری که Permission دیدن Thread ندارد نباید بتواند با پیام:

`communication:thread:join`

به room آن Thread وارد شود. REST همچنان source of truth است و WebSocket همان Scopeهای Phase 1.5 را رعایت می‌کند.

## تست 10 — JWT expiry

با access token کوتاه‌عمر، بعد از expiry اتصال WebSocket بسته می‌شود. Frontend یک REST request برای stats اجرا می‌کند؛ interceptor موجود refresh token را انجام می‌دهد و سپس WebSocket با access token جدید reconnect می‌شود.

## Production

اگر Frontend مستقیماً به API public متصل است، `NEXT_PUBLIC_API_URL` کافی است و WebSocket URL از همان origin ساخته می‌شود.

در صورت نیاز می‌توان جداگانه تعریف کرد:

```env
NEXT_PUBLIC_SOCKET_URL=https://api.example.com
```

Frontend آن را به `wss://api.example.com/communication-ws` تبدیل می‌کند.

اگر Reverse Proxy دارید باید Upgrade را برای `/communication-ws` عبور دهد. نمونه Nginx:

```nginx
location /communication-ws {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## مواردی که عمداً هنوز در Phase 2A نیستند

- Mention
- Notification Center
- Attachment
- Advanced Search/Filters

این موارد Phase 2B هستند.

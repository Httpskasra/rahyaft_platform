# Communication — Phase 2B

این فاز روی Phase 2A ساخته شده و قابلیت‌های زیر را اضافه می‌کند:

- Mention واقعی کاربران با `@User`
- Notification Center با اعلان Message / Mention / Assignment / Attachment
- Attachment با محدودیت 20MB و whitelist نوع فایل
- ذخیره پایدار فایل‌ها در volume پروداکشن Docker
- Advanced Search / Filters شامل Type, Creator, Assignee, Participant, Has Attachment علاوه بر Status/Priority/Search
- realtime event برای اعلان و فایل

## Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

Migration جدید:

```text
20260831000100_communication_phase_2b
```

مدل‌های جدید:

- `ThreadMention`
- `ThreadAttachment`
- `CommunicationNotification`

## APIهای جدید

```text
GET  /api/v1/communication/notifications
POST /api/v1/communication/notifications/:id/read
POST /api/v1/communication/notifications/read-all
POST /api/v1/communication/threads/:id/attachments
GET  /api/v1/communication/attachments/:id
```

`POST /threads/:id/messages` نیز اکنون `mentionUserIds` می‌پذیرد.

## تست 1 — Mention

1. با User A و User B وارد یک Thread مشترک شوید.
2. User A در Composer دکمه `@ User B` را بزند.
3. پیام را ارسال کند.
4. User B باید بدون refresh اعلان Mention دریافت کند.
5. در DB بررسی کنید:

```sql
SELECT * FROM "ThreadMention" ORDER BY "createdAt" DESC;
```

یک درخواست دستکاری‌شده با UUID کاربری که Participant فعال Thread نیست باید `400` بگیرد.

## تست 2 — Notification Center

در دو مرورگر با دو کاربر وارد شوید. موارد زیر باید اعلان realtime ایجاد کنند:

- پیام جدید
- Mention
- Assign شدن
- Attachment جدید

Badge زنگ باید بدون refresh افزایش یابد. با باز کردن اعلان، همان Thread باز می‌شود. «خواندن همه» باید badge را صفر کند.

DB:

```sql
SELECT "userId", type, title, "readAt", "createdAt"
FROM "CommunicationNotification"
ORDER BY "createdAt" DESC;
```

## تست 3 — Attachment

فرمت‌های مجاز:

- PDF
- XLS/XLSX
- DOCX
- PNG/JPG/WEBP
- TXT

حداکثر اندازه: `20MB`.

1. یک فایل PDF زیر 20MB آپلود کنید.
2. فایل باید در Thread ظاهر شود.
3. User B باید realtime فایل را ببیند و اعلان بگیرد.
4. روی فایل کلیک و download را تست کنید.
5. فایل exe یا فایل بزرگ‌تر از 20MB باید reject شود.

در پروداکشن volume زیر اضافه شده است:

```yaml
communication_uploads:/app/uploads/communication
```

پس rebuild کانتینر فایل‌ها را حذف نمی‌کند.

## تست 4 — Advanced Filters

فیلترهای زیر را جدا و ترکیبی تست کنید:

- Status
- Priority
- Type
- Creator
- Assignee
- Participant
- Has Attachment / Without Attachment
- Search در title و body پیام

مثال:

```text
Type=REQUEST
Priority=URGENT
Assignee=User B
Has Attachment=true
```

فقط Threadهای منطبق باید نمایش داده شوند.

## تست 5 — Permission

- کاربر غیر Participant نباید Attachment آپلود کند.
- دانلود Attachment باید فقط با Permission/Scope معتبر Thread ممکن باشد.
- Mention کاربر خارج Thread باید reject شود.
- Notificationهای یک User نباید توسط User دیگر قابل read/update باشند.

## اجرای Development

در این پروژه `docker-compose.dev.yml` فقط infrastructure را بالا می‌آورد. پس Postgres/Redis/RabbitMQ را با Compose بالا بیاورید و backend/frontend را مطابق روند فعلی پروژه اجرا کنید.

## Production

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

برای WebSocket همچنان reverse proxy مسیر `/communication-ws` باید Upgrade headers را پاس دهد.

## خارج از Scope این فاز

این موارد برای Phase 3 و بعد هستند:

- اتصال Thread به Customer / Repair / Form / Opportunity
- Object Storage خارجی (MinIO/S3/R2) برای scale چند instance
- AI summary / action items / semantic search
- Analytics مدیریتی

# Communication Phase 1.5 — Core Hardening

این مرحله بین Core و Real-time قرار دارد و هدفش این است که قبل از اضافه‌شدن WebSocket/Notification/Attachment، هسته ارتباطات از نظر دسترسی، تاریخچه و مقیاس‌پذیری پایدار باشد.

## تغییرات انجام‌شده

### 1) Permission Scope واقعی در خود Communication queryها
قبلاً Guard داشتن permission را بررسی می‌کرد، اما `CommunicationService.assertAccess()` دوباره فقط membership را قبول می‌کرد. در نتیجه کاربری با `ORG_WIDE` ممکن بود route را رد کند اما Service او را 403 کند.

اکنون Scope در queryهای Thread اعمال می‌شود:

- `SELF`: فقط Threadهایی که کاربر عضو فعال آنهاست.
- `TEAM`: Threadهای خود کاربر + Threadهایی که creator زیرمجموعه مستقیم اوست.
- `DEPARTMENT`: membership + Threadهای department خود کاربر.
- `DEPARTMENT_SUBTREE`: membership + department خود کاربر و تمام child departmentها.
- `RELATED_DEPARTMENTS`: membership + departmentهای مرتبط بر اساس relation type.
- `ORG_WIDE`: همه Threadها.

نکته امنیتی: حتی مدیر `ORG_WIDE` برای **ارسال پیام** باید Participant فعال Thread باشد. Scope مدیریتی اجازه مشاهده/مدیریت می‌دهد، ولی شخص را بی‌صدا وارد مکالمه نمی‌کند.

همچنین PermissionGuard در صورت داشتن یک permission با چند Scope، قوی‌ترین Scope را انتخاب می‌کند و دیگر به ترتیب Roleها وابسته نیست.

### 2) Assignment History واقعی
Unique قبلی روی `(threadId, userId)` حذف شد. اکنون هر بار assign مجدد یک رکورد جدید می‌سازد و رکورد قبلی با `completedAt` محفوظ می‌ماند.

Migration جدید:

`20260828000100_communication_phase_1_5_hardening`

### 3) Cursor Pagination پیام‌ها
جزئیات Thread دیگر تمام Messageها را load نمی‌کند. اولین بار آخرین 30 پیام می‌آید.

API جدید:

`GET /api/v1/communication/threads/:id/messages?cursor=<messageId>&limit=30`

Response:

```json
{
  "items": [],
  "pageInfo": {
    "hasMore": true,
    "nextCursor": "..."
  }
}
```

در UI دکمه «نمایش پیام‌های قدیمی‌تر» اضافه شده است.

### 4) Activity Timeline
نمایش Messageها از Timeline جدا شده و `ThreadTimeline` component ایجاد شده است. Activityهای سیستمی مانند تغییر Status/Priority، add/remove participant و assignment بین جریان مکالمه نمایش داده می‌شوند. `MESSAGE_SENT` از activityهای نمایشی حذف شده تا خود Message دوباره تکرار نشود.

### 5) Edge-case hardening
- حذف creator از participantها ممنوع باقی مانده است.
- حذف participant غیرفعال/ناموجود 404 می‌دهد.
- assign دوباره وقتی assignment فعال وجود دارد duplicate ایجاد نمی‌کند.
- unassign کاربری که assignment فعال ندارد 404 می‌دهد.
- addParticipant برای عضو برگشتی `joinedAt` را reset می‌کند.
- read tracking برای مدیر Scope-based که Participant نیست، membership مصنوعی ایجاد نمی‌کند.

### 6) تست‌های خودکار اضافه‌شده
- `communication.service.spec.ts`: SELF / DEPARTMENT / DEPARTMENT_SUBTREE / ORG_WIDE scope behavior
- `permission.guard.spec.ts`: انتخاب قوی‌ترین Scope در چند Role

## روش اجرا

از ریشه پروژه:

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml up -d --build
```

Migration باید در startup backend اعمال شود. سپس:

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml logs -f backend
```

در log نباید خطای Prisma migration یا Nest build وجود داشته باشد.

## تست Acceptance فاز 1.5

### Test A — Migration
در DB بررسی کنید unique قبلی Assignment حذف شده باشد و index جدید وجود داشته باشد.

در PostgreSQL:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ThreadAssignment';
```

نباید `ThreadAssignment_threadId_userId_key` وجود داشته باشد.

### Test B — Assignment history
1. Thread بسازید.
2. User B را assign کنید.
3. User B را unassign کنید.
4. دوباره User B را assign کنید.

سپس:

```sql
SELECT "userId", "assignedAt", "completedAt"
FROM "ThreadAssignment"
WHERE "threadId" = '<THREAD_ID>'
ORDER BY "assignedAt";
```

باید برای User B دو رکورد مستقل ببینید؛ رکورد اول `completedAt` دارد و رکورد دوم active است.

### Test C — SELF access
یک کاربر عادی که Participant نیست UUID یک Thread دیگر را مستقیم باز کند. باید `403` بگیرد.

### Test D — ORG_WIDE read
کاربر مدیریتی با `communication:read / ORG_WIDE` ولی بدون Participant بودن باید بتواند همان Thread را مشاهده کند.

### Test E — ORG_WIDE cannot silently chat
همان مدیر اگر Participant Thread نیست و بخواهد Message ارسال کند، باید `403` بگیرد. ابتدا باید به Thread اضافه شود و سپس بتواند پیام بدهد.

### Test F — Department scope
کاربری با `communication:read / DEPARTMENT`:
- Thread department خودش را ببیند.
- Thread department دیگر را، اگر Participant آن نیست، نبیند.
- اگر Participant Thread department دیگر باشد، آن Thread را ببیند.

### Test G — Cursor pagination
در یک Thread حداقل 35 پیام بسازید.

هنگام باز کردن Thread فقط 30 پیام آخر باید نمایش داده شود و بالای Timeline دکمه «نمایش پیام‌های قدیمی‌تر» دیده شود. با زدن آن 5 پیام قدیمی‌تر باید بدون duplicate اضافه شوند.

### Test H — Activity timeline
Status و Priority را تغییر دهید، یک Participant اضافه/حذف کنید و assign/unassign انجام دهید. رویدادهای سیستمی باید در Timeline دیده شوند و `MESSAGE_SENT` نباید به‌صورت event جداگانه کنار Message تکرار شود.

### Test I — Automated tests
داخل backend:

```bash
npm test -- communication.service.spec.ts permission.guard.spec.ts --runInBand
```

هر دو suite باید pass شوند.

## شرط رفتن به Phase 2A
اگر تست‌های A تا I درست باشند، Phase 1.5 accepted است و مرحله بعد:

- WebSocket Gateway
- realtime message delivery
- realtime inbox/unread/thread update
- optimistic UI
- reply

خواهد بود.

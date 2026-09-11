# Communication Phase 3 — Integration

این فاز سیستم ارتباطات سازمانی را از یک ماژول مستقل به رکوردهای واقعی کسب‌وکار متصل می‌کند.

## هدف

یک Thread می‌تواند همزمان به چند موجودیت مرتبط باشد، بدون افزودن FKهای پراکنده به مدل Thread.

مدل مرکزی جدید:

```text
Thread
  └── ThreadEntityLink[]
        ├── CUSTOMER
        ├── REPAIR
        ├── FORM
        ├── FORM_SUBMISSION
        ├── SALES_OPPORTUNITY
        ├── USER
        └── DEPARTMENT
```

## Migration

```text
backend/prisma/migrations/20260831000200_communication_phase_3_integration/migration.sql
```

مدل جدید Prisma:

```prisma
model ThreadEntityLink {
  id          String           @id @default(uuid())
  threadId    String
  entityType  ThreadEntityType
  entityId    String
  label       String
  subtitle    String?
  href        String?
  createdById String?
  createdAt   DateTime         @default(now())

  thread    Thread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  createdBy User?  @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@unique([threadId, entityType, entityId])
  @@index([entityType, entityId])
  @@index([threadId, createdAt])
}
```

`label/subtitle/href` به صورت snapshot ذخیره می‌شوند تا Timeline و تاریخچه گفتگو حتی در صورت تغییرات بعدی رکورد اصلی، context قابل فهمی داشته باشند.

---

# Parent Context خودکار

برای جلوگیری از Link دستی و تکراری، بعضی رکوردها context والد را خودکار اضافه می‌کنند:

```text
Repair
 ├── REPAIR
 └── CUSTOMER   ← خودکار

Sales Opportunity
 ├── SALES_OPPORTUNITY
 └── CUSTOMER   ← خودکار

Form Submission
 ├── FORM_SUBMISSION
 └── FORM       ← خودکار
```

این رفتار باعث می‌شود مثلاً Thread مربوط به یک Repair در صفحه Customer همان Repair نیز پیدا شود.

---

# APIهای Phase 3

## جستجوی رکورد برای اتصال

```http
GET /api/v1/communication/entities/search?type=REPAIR&search=R-100
```

## تمام گفتگوهای مرتبط با یک رکورد

```http
GET /api/v1/communication/entities/REPAIR/<uuid>/threads
```

## اتصال یک رکورد به Thread موجود

```http
POST /api/v1/communication/threads/<threadId>/entity-links
Content-Type: application/json

{
  "entityType": "CUSTOMER",
  "entityId": "<uuid>"
}
```

## حذف Link

```http
DELETE /api/v1/communication/threads/<threadId>/entity-links/CUSTOMER/<uuid>
```

حذف Link فقط `ThreadEntityLink` را حذف می‌کند و به هیچ عنوان Customer/Repair/Form اصلی حذف نمی‌شود.

---

# Security

Communication نباید راه دور زدن Permission ماژول‌های اصلی باشد.

برای موجودیت‌های محافظت‌شده، علاوه بر Permission ارتباطات، Permission خواندن resource اصلی نیز بررسی می‌شود:

```text
REPAIR          → repairs:read
FORM            → forms:read
FORM_SUBMISSION → form-submissions:read
```

بنابراین کاربری که `communication:read` دارد ولی `repairs:read` ندارد نمی‌تواند از Entity Search برای دیدن Repairها استفاده کند یا لیست Threadهای یک Repair را بگیرد.

Customer در پروژه فعلی Controller عمومی دارد، بنابراین فعلاً همان سیاست دسترسی موجود Customer حفظ شده است.

User و Department نیز با Directory سازمانی Communication هماهنگ هستند.

---

# UX اضافه‌شده

## Customer

در جزئیات Customer:

```text
[ گفتگوی مرتبط ]

ارتباطات سازمانی
3 گفتگو
```

همچنین روی Repair و Sales Opportunityهای Customer دکمه contextual conversation وجود دارد.

## Repair

در صفحه Repair:

```text
[ گفتگو ]

گفتگوهای مرتبط با این تعمیر
```

ایجاد Thread از Repair، Customer والد را هم خودکار Link می‌کند.

## Form

در Form Detail:

```text
[ گفتگو ]

گفتگوهای مرتبط با فرم
```

## Form Submission

هر Submission در جدول Analytics یک دکمه «ارتباط» دارد.

## User

در User Detail می‌توان گفتگوهای مرتبط با همان کاربر را مشاهده یا ایجاد کرد.

## Department

در Department Detail نیز گفتگوهای مربوط به واحد سازمانی قابل مشاهده هستند.

## داخل Thread

بخش جدید:

```text
مرتبط با
[مشتری: بیمارستان میلاد] [تعمیر: R-102] [+ اتصال رکورد]
```

از همانجا می‌توان رکورد جدید جستجو، Link یا Unlink کرد.

---

# تست 1 — Migration

در Development:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

بررسی Migration:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ThreadEntityLink';
```

باید یک row برگرداند.

برای enum:

```sql
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'ThreadEntityType';
```

باید 7 مقدار را ببینی.

---

# تست 2 — Customer contextual conversation

1. وارد `/dashboard/customers` شو.
2. یک مشتری را باز کن.
3. روی «گفتگوی مرتبط» بزن.
4. صفحه Communication باید با modal ساخت Thread باز شود.
5. عنوان، اعضا و پیام اولیه را وارد کن.
6. Thread را ایجاد کن.

بعد در DB:

```sql
SELECT
  "threadId",
  "entityType",
  "entityId",
  "label"
FROM "ThreadEntityLink"
WHERE "threadId" = '<THREAD_ID>';
```

باید `CUSTOMER` را ببینی.

به صفحه Customer برگرد. Thread جدید باید در بخش «ارتباطات سازمانی» نمایش داده شود.

---

# تست 3 — Repair و auto-link Customer

1. یک Repair را باز کن.
2. روی «گفتگو» بزن.
3. Thread ایجاد کن.

SQL:

```sql
SELECT "entityType", "entityId", "label"
FROM "ThreadEntityLink"
WHERE "threadId" = '<THREAD_ID>'
ORDER BY "createdAt";
```

باید حداقل این دو Link را ببینی:

```text
REPAIR
CUSTOMER
```

Thread باید هم در Repair و هم در Customer والد نمایش داده شود.

---

# تست 4 — Sales Opportunity و Customer والد

از کارت Sales Opportunity داخل Customer روی «گفتگو» بزن و Thread بساز.

در `ThreadEntityLink` باید:

```text
SALES_OPPORTUNITY
CUSTOMER
```

وجود داشته باشد.

---

# تست 5 — Form Submission و Form والد

1. Form Detail را باز کن.
2. بخش Submissionها را باز کن.
3. روی دکمه «ارتباط» یک Submission بزن.
4. Thread بساز.

باید:

```text
FORM_SUBMISSION
FORM
```

به صورت خودکار ثبت شوند.

Thread باید در Form Detail نیز دیده شود.

---

# تست 6 — User و Department

از User Detail یک Thread contextual بساز.

DB باید:

```text
USER
```

داشته باشد.

همین تست را برای Department انجام بده و `DEPARTMENT` را بررسی کن.

---

# تست 7 — اضافه‌کردن Link از داخل Thread

1. یک Thread معمولی باز کن.
2. بخش «مرتبط با» را پیدا کن.
3. روی `+ اتصال رکورد` بزن.
4. نوع را مثلاً `مشتری` انتخاب کن.
5. نام مشتری را Search کن.
6. روی نتیجه کلیک کن.

Link باید بلافاصله ظاهر شود.

در مرورگر دوم که همان Thread باز است، به دلیل realtime `communication:thread.updated` باید تغییر Thread نیز دریافت شود.

---

# تست 8 — حذف Link بدون حذف Entity

داخل Thread روی X یک Customer Link بزن.

بعد:

```sql
SELECT *
FROM "ThreadEntityLink"
WHERE "threadId" = '<THREAD_ID>'
  AND "entityType" = 'CUSTOMER'
  AND "entityId" = '<CUSTOMER_ID>';
```

نباید row وجود داشته باشد.

اما:

```sql
SELECT id
FROM "Customer"
WHERE id = '<CUSTOMER_ID>';
```

باید همچنان Customer را برگرداند.

---

# تست 9 — Entity Filter

از صفحه Customer روی «مشاهده همه گفتگوها» بزن.

Communication باید با filter contextual باز شود و فقط Threadهایی را نشان دهد که به همان Customer Link شده‌اند.

URL نمونه:

```text
/dashboard/communications?entityType=CUSTOMER&entityId=<uuid>
```

حذف chip فیلتر باید دوباره Inbox معمولی را نمایش دهد.

---

# تست 10 — Permission Security

یک User بساز/انتخاب کن که:

```text
communication:read = دارد
repairs:read       = ندارد
```

با آن User درخواست زیر را بزن:

```http
GET /api/v1/communication/entities/search?type=REPAIR
```

باید:

```text
403 Forbidden
```

بگیرد.

همین مورد برای:

```text
FORM
FORM_SUBMISSION
```

تست شود.

همچنین:

```http
GET /api/v1/communication/entities/REPAIR/<repairId>/threads
```

برای همان User باید 403 بدهد.

---

# تست 11 — Duplicate Link

یک Customer را دو بار به یک Thread اضافه کن.

به خاطر:

```prisma
@@unique([threadId, entityType, entityId])
```

نباید duplicate ساخته شود.

SQL:

```sql
SELECT "threadId", "entityType", "entityId", COUNT(*)
FROM "ThreadEntityLink"
GROUP BY "threadId", "entityType", "entityId"
HAVING COUNT(*) > 1;
```

باید `0 rows` باشد.

---

# تست 12 — Deep Links

لینک Entity داخل Thread را باز کن.

موارد زیر را بررسی کن:

```text
Customer   → همان Customer انتخاب شود
Repair     → همان Repair انتخاب شود
Form       → Form Detail درست باز شود
User       → همان User انتخاب شود
Department → همان Department انتخاب شود
```

---

# تست‌های خودکار Backend

```bash
cd backend
npm test -- communication.service.spec.ts --runInBand
```

در Phase 3 تست‌های Permission Entity و auto parent-context نیز به suite اضافه شده‌اند.

---

# Production

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

لاگ‌ها:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```

مطمئن شو migration `20260831000200_communication_phase_3_integration` با موفقیت اجرا شده است.

---

# Acceptance Criteria

Phase 3 زمانی تأیید می‌شود که:

- [ ] Migration موفق باشد.
- [ ] Customer contextual Thread کار کند.
- [ ] Repair به Customer والد auto-link شود.
- [ ] SalesOpportunity به Customer والد auto-link شود.
- [ ] FormSubmission به Form والد auto-link شود.
- [ ] User و Department integration کار کنند.
- [ ] RelatedCommunications رکوردها را درست نشان دهد.
- [ ] Add/Remove link داخل Thread کار کند.
- [ ] Entity filter درست باشد.
- [ ] Deep-linkها رکورد درست را باز کنند.
- [ ] Permission ماژول‌های محافظت‌شده قابل bypass نباشد.
- [ ] Duplicate Link ساخته نشود.
- [ ] حذف Link هیچ Entity اصلی را حذف نکند.

بعد از تأیید این موارد، مرحله بعد **Phase 4 — AI** است.

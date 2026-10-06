# Phase 3 — SLA Analytics

این فاز روی خروجی Phase 2 پیاده‌سازی شده و SLA واقعی و قابل تنظیم را برای Forms و Repairs اضافه می‌کند.

## 1) تغییرات دیتابیس

Migration جدید:

```text
backend/prisma/migrations/20260930_phase3_sla_analytics/migration.sql
```

### Forms / Approval

به `ApprovalPolicy` اضافه شد:

- `overallSlaHours`: SLA کل گردش تأیید

به `ApprovalStep` اضافه شد:

- `slaHours`: SLA مستقل هر مرحله

به `ApprovalInstance` اضافه شد:

- `overallSlaHours`
- `overallDueAt`
- `stepSlaConfig`

این سه فیلد Snapshot هستند. یعنی SLA زمان ایجاد Submission روی Approval Instance ذخیره می‌شود و تغییر بعدی Policy باعث تغییر گزارش تاریخی Submissionهای قبلی نمی‌شود.

### Repairs

رابطه واقعی `RepairCase -> RepairSla` فعال شد.

مدل جدید `RepairSlaPolicy` اضافه شد:

- `type`: `IN_HOUSE | ON_SITE`
- `targetHours`
- `isActive`

هر Repair جدید در صورت وجود Policy فعال، یک `RepairSla` با `dueAt` مخصوص خودش می‌گیرد. بنابراین تغییر Policy آینده، SLA پرونده‌های قبلی را تغییر نمی‌دهد.

---

## 2) Forms SLA

### تنظیم SLA

مسیر:

```text
/dashboard/forms/manage/{FORM_ID}/approval
```

در Approval Policy Editor اکنون می‌توان تعیین کرد:

- SLA کل Workflow به ساعت
- SLA هر Approval Step به ساعت

مثال صرفاً برای تست:

```text
Overall SLA: 24h
Step 1: 4h
Step 2: 8h
Step 3: 12h
```

اعداد واقعی باید توسط سازمان تعیین شوند؛ داخل پروژه مقدار SLA ثابت اجباری قرار داده نشده است.

### Snapshot / Backfill

- Submissionهای جدید SLA را هنگام ساخته شدن Snapshot می‌کنند.
- هنگام اولین تعریف SLA برای یک فرم قدیمی، Approval Instanceهای قبلی که Snapshot ندارند یک بار Backfill می‌شوند.
- تغییر بعدی SLA، Snapshot تاریخی قبلی را بازنویسی نمی‌کند.

### Analytics تک فرم

مسیر:

```text
/dashboard/forms/manage/{FORM_ID}/analytics
```

اضافه شد:

- SLA Compliance Rate
- Within SLA
- SLA Breached
- Average Overdue Hours
- SLA Trend
- Step SLA Compliance
- Step SLA Breaches
- Average overdue by step
- SLA target per step

### Analytics کلی فرم‌ها

مسیر:

```text
/dashboard/forms/analytics
```

اضافه شد:

- Overall Forms SLA Compliance
- Total within SLA
- Total breached
- SLA target per form
- SLA compliance per form

---

## 3) Repairs SLA

### API تنظیم Policy

```http
GET /repairs/sla/policies
PATCH /repairs/sla/policies
```

نمونه Body:

```json
{
  "policies": [
    { "type": "IN_HOUSE", "targetHours": 48, "isActive": true },
    { "type": "ON_SITE", "targetHours": 24, "isActive": true }
  ]
}
```

مقادیر بالا فقط نمونه تست هستند.

### UI تنظیم

مسیر:

```text
/dashboard/repairs/reports
```

در بالای صفحه می‌توان برای هر نوع تعمیر:

- Policy را فعال/غیرفعال کرد
- Target Hours را تعیین کرد
- تنظیمات را ذخیره کرد

### Backfill

هنگام اولین فعال‌سازی Policy:

- پرونده‌های قدیمی همان نوع که `RepairSla` ندارند Snapshot می‌شوند.
- `dueAt = createdAt + targetHours`
- برای پرونده تکمیل‌شده `completedAt` و `isBreached` نیز ثبت می‌شود.
- SLA Snapshotهای قبلی با تغییر Policy بازنویسی نمی‌شوند.

### Repair Analytics

اضافه شد:

- SLA Compliance Rate
- Assessed Cases
- Within SLA
- Breached SLA
- Average Overdue Hours
- SLA by Repair Type
- SLA by Technician
- SLA Trend

پرونده‌های `CANCELED` و `REJECTED` از محاسبه Compliance حذف می‌شوند.

برای پرونده باز:

```text
breached = current/end-of-selected-range > dueAt
```

برای پرونده تکمیل‌شده:

```text
breached = completedAt > dueAt
```

---

## 4) ایمن‌سازی Approval Policy

قبل از این فاز `createOrUpdatePolicy` Policy قبلی را حذف و دوباره ایجاد می‌کرد. این رفتار در صورت وجود Approval History می‌توانست با `ApprovalAction`های قبلی مشکل ایجاد کند.

در Phase 3:

- Policy موجود Update می‌شود.
- Step موجود Upsert می‌شود.
- SLA بدون حذف History قابل تغییر است.
- حذف Step یا Policy دارای Approval History با خطای واضح متوقف می‌شود.

---

# نصب و Migration

بعد از Extract پروژه:

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

اگر محیط توسعه شما دیتابیس جداگانه دارد، قبل از migration از دیتابیس Backup بگیرید.

---

# تست Phase 3

## Test A — Forms Overall SLA

1. یک Form دارای Approval Workflow باز کنید.
2. وارد تب `گردش تأیید` شوید.
3. یک Overall SLA وارد کنید.
4. برای Stepها SLA تعریف کنید.
5. ذخیره کنید.
6. یک Submission جدید بسازید.
7. مسیر زیر را باز کنید:

```text
/dashboard/forms/manage/{FORM_ID}/analytics
```

باید بخش SLA نمایش داده شود.

## Test B — Step SLA

برای تست سریع در محیط Development می‌توانید SLA یک Step را مقدار کوچکی قرار دهید و یک Submission را Pending نگه دارید. پس از عبور زمان هدف، همان Step باید Breached شود.

## Test C — Historical Snapshot

1. SLA فرم را تعریف کنید.
2. Submission ایجاد کنید.
3. SLA را تغییر دهید.
4. Submission قبلی باید با Snapshot قبلی محاسبه شود، نه مقدار جدید.

## Test D — Repair SLA

1. وارد `/dashboard/repairs/reports` شوید.
2. Policy یکی از `IN_HOUSE` یا `ON_SITE` را فعال کنید.
3. Target Hours را وارد و Save کنید.
4. یک Repair جدید از همان Type بسازید.
5. Analytics را Refresh کنید.
6. باید پرونده در SLA Analytics دیده شود.

## Test E — Repair Backfill

بعد از تعریف اولین Policy، Repairهای قبلی همان Type نیز در SLA Analytics ظاهر می‌شوند و SLA آنها Snapshot می‌شود.

## Test F — Technician SLA

چند Repair را به تکنسین‌های مختلف Assign کنید. در Reports باید جدول و نمودار SLA به تفکیک تکنسین نمایش داده شود.

---

# فایل‌های اصلی تغییرکرده

Backend:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260930_phase3_sla_analytics/migration.sql`
- `backend/src/approvals/dto/create-approval-policy.dto.ts`
- `backend/src/approvals/approvals.service.ts`
- `backend/src/forms/forms.service.ts`
- `backend/src/repairs/dto/update-repair-sla-policies.dto.ts`
- `backend/src/repairs/repairs.controller.ts`
- `backend/src/repairs/repairs.service.ts`

Frontend:

- `frontend/src/lib/api/approvals.ts`
- `frontend/src/lib/api/forms.ts`
- `frontend/src/lib/api/repairs.ts`
- `frontend/src/features/forms/detail/approval/ApprovalPolicyEditor.tsx`
- `frontend/src/features/forms/manager/FormAnalyticsPage.tsx`
- `frontend/src/app/dashboard/forms/analytics/page.tsx`
- `frontend/src/app/dashboard/repairs/reports/page.tsx`

---

# Validation انجام‌شده

تمام فایل‌های TypeScript/TSX تغییرکرده با TypeScript compiler API از نظر Syntax parse شدند و خطای Syntax نداشتند.

نصب کامل dependency در محیط تولید فایل به علت timeout محیط تکمیل نشد، بنابراین `npm run build` کامل در این محیط اجرا نشد. پس بعد از `npm install + prisma generate`، Build کامل Backend و Frontend را روی محیط خودتان اجرا کنید.

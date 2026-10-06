# Phase 3 — SLA Analytics

این فاز روی خروجی Phase 2 پیاده‌سازی شده و SLA واقعی را برای Forms و Repairs اضافه می‌کند.

## 1) تغییرات دیتابیس

Migration جدید:

`backend/prisma/migrations/20260930230000_add_phase3_sla_analytics/migration.sql`

### Forms
- `Form.slaHours`: SLA کلی فرم از زمان ثبت Submission تا تصمیم نهایی.
- `ApprovalStep.slaHours`: SLA مستقل هر مرحله Approval.

### Repairs
- Relation واقعی `RepairCase.sla -> RepairSla` فعال شده است.
- `RepairSla.targetHours`, `createdAt`, `updatedAt` اضافه شده‌اند.
- مدل `RepairSlaPolicy` اضافه شده است؛ Policy بر اساس `RepairType` (`IN_HOUSE`, `ON_SITE`) تعریف می‌شود.
- هنگام ساخت Repair جدید، SLA فعال همان نوع snapshot می‌شود و `dueAt` ساخته می‌شود.
- هنگام رسیدن Repair به `CLOSED`, `DELIVERED`, `NO_REPAIR_REQUIRED`، `RepairSla.completedAt` و `isBreached` به‌روز می‌شوند.
- Repairهای قدیمی بدون snapshot در Analytics از Policy فعال فعلی fallback می‌گیرند.

## 2) APIهای جدید

### Forms
`PATCH /forms/:id/sla`

نمونه body:
```json
{
  "slaHours": 24,
  "steps": [
    { "stepId": "...", "slaHours": 4 },
    { "stepId": "...", "slaHours": 8 }
  ]
}
```

`GET /forms/:id/analytics` اکنون بخش `sla` نیز برمی‌گرداند:
- targetHours
- eligible
- compliant
- breached
- complianceRate
- averageOverdueHours
- trend
- steps
- breaches

### Repairs
`GET /repairs/sla-policies`

`PATCH /repairs/sla-policies`

نمونه body:
```json
{
  "items": [
    { "type": "IN_HOUSE", "targetHours": 72, "isActive": true },
    { "type": "ON_SITE", "targetHours": 24, "isActive": true }
  ]
}
```

`GET /repairs/analytics/overview` اکنون بخش `sla` دارد:
- eligible
- compliant
- breached
- atRisk
- complianceRate
- averageOverdueHours
- trend
- byType
- breaches

## 3) منطق محاسبه SLA

### Form SLA
برای Submission دارای Approval workflow:

`dueAt = submission.createdAt + form.slaHours`

اگر Approval نهایی شده باشد، زمان پایان `ApprovalInstance.updatedAt` است. اگر هنوز Pending باشد، زمان فعلی انتهای بازه گزارش برای محاسبه استفاده می‌شود.

اگر `endAt > dueAt` باشد، SLA نقض شده است.

### Approval Step SLA
شروع هر Step:
- Step اول: `ApprovalInstance.createdAt`
- Stepهای بعدی: زمان Action مرحله قبلی

پایان:
- Action همان مرحله، یا
- انتهای بازه گزارش در صورت Pending بودن روی همان مرحله

### Repair SLA
برای Repair جدید Policy فعال snapshot می‌شود:

`dueAt = repair.createdAt + policy.targetHours`

Repairهای `CANCELED` و `REJECTED` از محاسبه compliance خارج می‌شوند.

`atRisk` یعنی Repair هنوز breach نشده ولی کمتر از 25٪ SLA (حداقل 2 ساعت) تا deadline باقی مانده است.

## 4) UI جدید

### Forms
مسیر:
`/dashboard/forms/manage/{FORM_ID}/analytics`

اضافه شده:
- SLA compliance KPI
- SLA breach count
- Average overdue
- تنظیم SLA کلی فرم
- تنظیم SLA هر Approval Step
- نمودار SLA trend
- نمودار compliance مراحل
- جدول Submissionهای breach شده

### Repairs
مسیر:
`/dashboard/repairs/reports`

اضافه شده:
- SLA compliance
- Breach count
- At-risk count
- Average overdue
- تنظیم SLA جدا برای IN_HOUSE و ON_SITE
- SLA trend
- SLA breakdown by repair type
- جدول پرونده‌های breach شده

## 5) اجرای Migration

در backend:

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

در production از migration deploy استفاده شود:

```bash
npx prisma migrate deploy
npx prisma generate
```

سپس frontend:

```bash
npm install
npm run dev
```

## 6) سناریوی تست Forms

1. یک Form با حداقل 2 Approval Step بسازید.
2. Analytics همان Form را باز کنید.
3. SLA کلی را مثلاً `24` ساعت قرار دهید.
4. Step 1 را `2` ساعت و Step 2 را `6` ساعت قرار دهید.
5. تنظیمات را ذخیره کنید.
6. چند Submission با وضعیت Pending/Approved/Rejected داشته باشید.
7. KPI و نمودار SLA را بررسی کنید.
8. برای تست سریع Breach موقتاً SLA را `1` ساعت قرار دهید و از Submissionهای قدیمی استفاده کنید.

## 7) سناریوی تست Repairs

1. `/dashboard/repairs/reports` را باز کنید.
2. SLA تعمیر داخل شرکت را مثلاً `72` ساعت تنظیم کنید.
3. SLA تعمیر در محل را مثلاً `24` ساعت تنظیم کنید.
4. یک Repair جدید ایجاد کنید.
5. در DB باید `RepairSla` همراه `targetHours` و `dueAt` ساخته شود.
6. پرونده را تا وضعیت نهایی جلو ببرید.
7. `completedAt` و `isBreached` در RepairSla را بررسی کنید.
8. Dashboard باید Compliance/Breach/At-risk را نمایش دهد.

## 8) نکات سازگاری

- داده‌های قبلی حذف نمی‌شوند.
- Repair قدیمی بدون RepairSla با Policy فعلی محاسبه می‌شود.
- SLA جدید Repairها snapshot است و تغییر Policy آینده SLA پرونده‌های قبلی را تغییر نمی‌دهد.
- Form SLA فعلاً configuration جاری Form است؛ Phase 4 روی insight/anomaly تمرکز خواهد کرد.

## 9) مرحله بعد

Phase 4:
- Rule-based Insight Engine
- period-over-period change detection
- bottleneck detection
- anomaly detection
- severity / confidence
- actionable recommendations بدون LLM

# Phase 4 — Insight & Anomaly Engine

این فاز روی Phase 3 ساخته شده و بدون LLM، KPIهای Forms و Repairs را به Insight عملیاتی تبدیل می‌کند.

## معماری

Database → Analytics Engine → KPI/Comparison → Rule Engine → Anomaly Detector → Insight + Evidence + Recommendation

هیچ تصمیم آماری در این فاز توسط مدل زبانی ساخته نمی‌شود.

## ساختار Insight

هر Insight شامل موارد زیر است:

- `id`
- `category`
- `severity`: `info | warning | critical | positive`
- `title`
- `message`
- `evidence[]`
- `recommendation`
- `metric/current/previous/changePct` در صورت وجود

Anomalyهای حجمی نیز شامل `actual`, `baseline`, `zScore`, `date` هستند.

## Forms Rule Engine

### Volume change
- فقط وقتی current و previous حداقل 5 Submission دارند.
- تغییر مطلق حداقل 30٪.

### High rejection
- حداقل 5 Workflow.
- Warning از 15٪ rejection.
- Critical از 30٪.

### Rejection trend
- current و previous هر دو حداقل 5 Workflow.
- افزایش حداقل 8 واحد درصد.

### Pending backlog
- حداقل 5 Workflow.
- Warning از 20٪ Pending.
- Critical از 40٪.

### Processing slowdown
- حداقل 3 تصمیم در current و previous.
- افزایش Average Processing Time حداقل 30٪.

### Approval bottleneck
- حداقل 3 ورودی به Step.
- میانگین انتظار حداقل 4 ساعت.
- Critical از 24 ساعت.

### Data quality
- حداقل 5 Submission.
- Field Fill Rate زیر 70٪.

### SLA
- حداقل 5 مورد قابل ارزیابی.
- Compliance زیر 90٪ هشدار.
- زیر 70٪ Critical.

### Submission anomaly
- حداقل 7 نقطه روزانه.
- Z-score حداقل 2.
- حجم روز باید حداقل 3 و حداقل 1.5 برابر baseline باشد.

## Repairs Rule Engine

### Volume change
- current و previous حداقل 5 Repair.
- تغییر حداقل 30٪.

### MTTR degradation
- حداقل 3 نمونه MTTR در هر بازه.
- افزایش حداقل 30٪.

### SLA compliance
- حداقل 5 مورد SLA.
- زیر 90٪ هشدار، زیر 70٪ Critical.

### Aging backlog
- حداقل 5 پرونده باز.
- حداقل 2 پرونده و حداقل 15٪ Open Cases با سن 14+ روز.

### Status bottleneck
- حداقل 3 نمونه Status Duration.
- Average Duration حداقل 8 ساعت.
- Critical از 24 ساعت.

### Second visit
- حداقل 5 پرونده دارای Visit.
- Warning از 20٪، Critical از 35٪.

### Technician workload imbalance
- حداقل 2 تکنسین فعال با حداقل 2 پرونده واگذار شده.
- Open workload یک تکنسین حداقل 1.75 برابر میانگین تیم و حداقل 3 پرونده.

### SLA At Risk
- حداقل 2 پرونده At-Risk.

### Repair volume anomaly
- همان روش Z-score Forms با حداقل 7 روز داده.

## UI

کامپوننت مشترک:

`frontend/src/components/analytics/InsightPanel.tsx`

در این صفحات استفاده می‌شود:

- `/dashboard/forms/analytics`
- `/dashboard/forms/manage/:id/analytics`
- `/dashboard/repairs/reports`

هر کارت Insight شامل Severity، Evidence و Recommendation است.

## فایل‌های اصلی تغییرکرده

### Backend
- `backend/src/forms/forms.service.ts`
- `backend/src/repairs/repairs.service.ts`

### Frontend
- `frontend/src/lib/api/analytics.ts`
- `frontend/src/lib/api/forms.ts`
- `frontend/src/lib/api/repairs.ts`
- `frontend/src/components/analytics/InsightPanel.tsx`
- `frontend/src/app/dashboard/forms/analytics/page.tsx`
- `frontend/src/features/forms/manager/FormAnalyticsPage.tsx`
- `frontend/src/app/dashboard/repairs/reports/page.tsx`

## دیتابیس

Phase 4 migration جدید ندارد.

ولی چون Phase 3 Prisma migration داشت، روی محیط تازه همچنان باید اجرا شود:

```bash
cd backend
npm install
npx prisma migrate deploy   # production
# یا npx prisma migrate dev در development
npx prisma generate
npm run build
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

## سناریوی تست Forms

1. یک Form با حداقل 2 Approval Step بسازید.
2. حداقل 10 Submission ثبت کنید.
3. بیش از 20٪ را Pending نگه دارید → Pending backlog باید ظاهر شود.
4. بیش از 15٪ را Reject کنید → Rejection insight باید ظاهر شود.
5. یک Step را چند ساعت/روز معطل نگه دارید → Bottleneck insight ظاهر می‌شود.
6. روی یک Field پاسخ ندهید تا Fill Rate زیر 70٪ شود → Data quality insight ظاهر می‌شود.
7. SLA کوتاه تعریف کنید و چند Submission را از SLA خارج کنید → SLA insight ظاهر می‌شود.

## سناریوی تست Repairs

1. حداقل 10 Repair ایجاد کنید.
2. چند Repair قدیمی باز با سن بیش از 14 روز داشته باشید → Aging backlog.
3. چند Case را در یک Status طولانی نگه دارید → Status bottleneck.
4. حداقل 5 Case دارای Visit ایجاد کنید و برای بیش از 20٪ `NEED_SECOND_VISIT` ثبت کنید.
5. بار Open یک Technician را به وضوح بیشتر از بقیه کنید → Workload imbalance.
6. SLA کوتاه تعریف کنید → SLA breach و At-Risk insight.
7. در یک روز تعداد Repair بسیار بیشتر از روزهای دیگر ثبت کنید → Statistical anomaly.

## نکته درباره Sample Size

Rule Engine عمداً روی داده کم هشدارهای شدید تولید نمی‌کند. اگر تنها 1 یا 2 رکورد دارید، نبود Insight خطا نیست؛ هدف جلوگیری از نتیجه‌گیری اشتباه روی Sample کوچک است.

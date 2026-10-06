# Phase 2 — Deep Analytics

این فاز روی خروجی Phase 1 پیاده‌سازی شده و **نیازی به Prisma migration جدید ندارد**.

## 1) Forms Deep Analytics

Endpoint موجود `GET /forms/:id/analytics` توسعه داده شد و علاوه بر KPIهای Phase 1 این خروجی‌ها را برمی‌گرداند:

### Approval Funnel
برای هر Approval Step:
- `entered`: تعداد Submissionهایی که وارد مرحله شده‌اند
- `processed`: تعداد تصمیم‌های ثبت‌شده
- `approved`
- `rejected`
- `pending`
- `conversionRate`
- `averageWaitHours`

زمان هر مرحله از پایان مرحله قبل (یا ایجاد workflow برای مرحله اول) تا ثبت ApprovalAction همان مرحله محاسبه می‌شود.

### Bottleneck
مرحله‌ای که بیشترین `averageWaitHours` را دارد به عنوان گلوگاه فعلی نمایش داده می‌شود.

### Dynamic Field Analytics
Schema فرم و `FormSubmission.data` به صورت مستقیم تحلیل می‌شوند:

- همه فیلدها: filled / missing / fillRate
- `number`: average / median / min / max
- `rating`: average / median / min / max + distribution
- `select`, `radio`, `checkbox`: distribution
- `date`: توزیع ماهانه
- `text`, `textarea`, `email`, `tel`: میانگین طول پاسخ

UI صفحه:
`/dashboard/forms/manage/{FORM_ID}/analytics`

موارد اضافه‌شده:
- اعلان Bottleneck
- Approval Funnel chart
- Average Wait Time per Step chart
- جدول جزئیات مراحل
- Field Analytics cards/charts

## 2) Repairs Deep Analytics

Endpoint موجود `GET /repairs/analytics/overview` توسعه داده شد.

### Aging Analysis
تمام پرونده‌هایی که تا پایان بازه هنوز باز هستند بررسی می‌شوند، حتی اگر قبل از بازه انتخابی ایجاد شده باشند:
- کمتر از 1 روز
- 1 تا 3 روز
- 3 تا 7 روز
- 7 تا 14 روز
- 14 روز و بیشتر

### Status Duration
با استفاده از `RepairStatusLog` مسیر هر Repair بازسازی و میانگین زمان ماندگاری در هر Status محاسبه می‌شود.

### Technician Analytics
برای هر تکنسین:
- assigned
- open
- completed
- MTTR
- visits
- First Visit Fix Rate
- Second Visit Rate

این اعداد برای تحلیل بارکاری/عملیات هستند و رتبه‌بندی کلی افراد انجام نمی‌شود.

### Visit Analytics
بر اساس `RepairVisit`:
- total visits
- cases with visits
- First Visit Fix Rate
- Second Visit Rate
- result distribution:
  - REPAIRED
  - NEED_SECOND_VISIT
  - NEED_PART
  - CUSTOMER_ABSENT
  - CANCELED

UI صفحه:
`/dashboard/repairs/reports`

موارد اضافه‌شده:
- Aging chart
- Status Duration chart
- Visit Result chart
- Technician Workload chart
- Technician Performance table
- First Visit Fix KPI

## فایل جدید مشترک نمودار

`frontend/src/components/charts/AnalyticsBarChart.tsx`

برای نمودارهای Bar افقی/عمودی و Stacked استفاده می‌شود.

---

# روش تست

## Backend

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

هیچ migration جدیدی برای Phase 2 لازم نیست.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## تست Forms

1. یک Form دارای Approval Policy با حداقل 2 مرحله بسازید.
2. چند Submission ایجاد کنید.
3. برخی را کامل approve کنید.
4. حداقل یک Submission را در مرحله اول یا دوم reject کنید.
5. حداقل یک Submission را pending باقی بگذارید.
6. صفحه زیر را باز کنید:

```text
/dashboard/forms/manage/{FORM_ID}/analytics
```

بررسی کنید:
- Funnel مراحل مطابق Approvalها باشد.
- Pending در مرحله درست قرار گرفته باشد.
- Reject در همان Step نمایش داده شود.
- Bottleneck بر اساس بیشترین Average Wait باشد.
- فیلدهای Number/Select/Rating/Date نمودار یا آمار مناسب نشان دهند.

### تست سریع Field Analytics
فرمی با این فیلدها بسازید:
- number: هزینه
- select: نوع درخواست
- rating: امتیاز
- date: تاریخ
- textarea: توضیحات

حداقل 5 تا 10 پاسخ ثبت کنید تا Distributionها قابل مشاهده باشند.

## تست Repairs

1. چند Repair با سن‌های مختلف داشته باشید.
2. وضعیت چند مورد را چند مرحله جلو ببرید.
3. Repairهایی با Technician متفاوت ایجاد/Assign کنید.
4. برای چند Repair، Visit با Resultهای متفاوت داشته باشید.
5. صفحه زیر را باز کنید:

```text
/dashboard/repairs/reports
```

بررسی کنید:
- Aging شامل Repairهای قدیمیِ هنوز باز هم باشد.
- Status Duration از تاریخچه وضعیت‌ها مقدار داشته باشد.
- تکنسین‌ها در جدول و Workload نمودار دیده شوند.
- First Visit Fix از اولین Visit هر Repair محاسبه شود.
- Repair با Visit دوم در Second Visit Rate لحاظ شود.

---

# نکات محاسباتی

- First Visit Fix Rate = پرونده‌هایی که اولین Visit آنها `REPAIRED` است / پرونده‌های دارای Visit
- Second Visit Rate = پرونده‌هایی با بیش از یک Visit یا First Visit=`NEED_SECOND_VISIT` / پرونده‌های دارای Visit
- Status Duration با بازسازی Timeline از `createdAt` و `RepairStatusLog` محاسبه می‌شود.
- Aging بر اساس پرونده‌های باز تا `to` بازه انتخابی است و محدود به `from` نیست.
- Field Analytics در Backend محاسبه می‌شود، نه در Browser.

# کنترل انجام‌شده

فایل‌های تغییرکرده Backend و Frontend با TypeScript `transpileModule` از نظر Syntax بررسی شدند و خطای syntax ندارند. تلاش برای `npm ci` کامل در محیط اجرا به timeout خورد، بنابراین Build dependency-aware کامل Nest/Next باید روی محیط پروژه اجرا شود.

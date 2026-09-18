# فیچر تولید (Production Flow Engine)

این نسخه قابلیت «تولید» را به پروژه اضافه می‌کند و فرم‌های موجود سیستم را به یک Workflow/Pipeline اجرایی تبدیل می‌کند.

## قابلیت‌های پیاده‌سازی‌شده

- ساخت Flow تولید با تعداد نامحدود مرحله.
- اتصال هر مرحله به یکی از فرم‌های موجود، شامل `customId` فرم.
- تعیین مسئول اجرای فرم برای هر مرحله.
- تعیین ناظر مستقل برای هر مرحله (اختیاری).
- تعیین تأییدکننده نهایی مستقل برای هر مرحله (اختیاری).
- تعیین زمان تخمینی و توضیح هر مرحله.
- اجرای واقعی یک Flow با شماره پیگیری خودکار مانند `PRD-20260911-0001`.
- Snapshot مراحل هنگام شروع Run؛ تغییرات بعدی Template روی Run قبلی اثر نمی‌گذارد.
- فعال‌شدن مرحله‌ها به‌ترتیب و قفل‌بودن مراحل آینده.
- روند مرحله: `READY -> IN_PROGRESS -> WAITING_SUPERVISOR -> WAITING_APPROVAL -> COMPLETED`.
- اگر ناظر تعریف نشده باشد مستقیماً به Approver می‌رود.
- اگر ناظر و Approver هیچ‌کدام تعریف نشده باشند پس از ثبت فرم مرحله تکمیل می‌شود.
- Reject باعث `NEEDS_REVISION` می‌شود و مسئول مرحله می‌تواند فرم را اصلاح و دوباره ارسال کند.
- ثبت تاریخچه بررسی‌های Supervisor و Approver با توضیح.
- داشبورد «کارهای من» برای مسئول اجرا، ناظر و تأییدکننده.
- نمایش نموداری Pipeline با React Flow و Edgeهای متحرک.
- نمایش درصد پیشرفت Run، مرحله جاری، تعداد مراحل تکمیل‌شده و Timeline بررسی‌ها.
- Auto refresh صفحه Run هر ۱۰ ثانیه در زمان اجرای فعال.
- Pause / Resume برای Run.
- UI مدرن RTL با Framer Motion، React Flow و Dark Mode.
- Permissionهای جدا برای `production-flows` و `production-runs`.

## مدل‌های دیتابیس جدید

- `ProductionFlow`: قالب خط تولید.
- `ProductionFlowStep`: مراحل قالب و اتصال به Form/User/Supervisor/Approver.
- `ProductionRun`: هر اجرای واقعی Flow.
- `ProductionRunStep`: Snapshot وضعیت هر مرحله در یک Run.
- `ProductionStepReview`: تاریخچه تأیید یا رد ناظر/تأییدکننده.

Enumهای جدید:

- `ProductionRunStatus`
- `ProductionRunStepStatus`
- `ProductionReviewType`
- `ProductionReviewAction`

## Endpointهای جدید

Base: `/api/v1/production`

- `GET /catalog` — فرم‌ها و کاربران قابل انتخاب در Builder.
- `GET /flows`
- `POST /flows`
- `GET /flows/:id`
- `PATCH /flows/:id`
- `DELETE /flows/:id`
- `POST /flows/:id/runs`
- `GET /runs`
- `GET /runs/:id`
- `GET /tasks/my`
- `POST /runs/:runId/steps/:stepId/begin`
- `POST /runs/:runId/steps/:stepId/submit`
- `POST /runs/:runId/steps/:stepId/supervisor-review`
- `POST /runs/:runId/steps/:stepId/approval`
- `POST /runs/:runId/pause`
- `POST /runs/:runId/resume`
- `POST /runs/:runId/cancel`

## Permissionها

برای مدیر Flow:

- `create/read/update/delete` روی `production-flows`
- `create/read/update` روی `production-runs`

Seed اصلی برای `superadmin` تمام Actionهای استاندارد را روی این دو Resource می‌سازد. Role معمولی `user` نیز برای انجام Taskهای محول‌شده `read production-flows` و `read/update production-runs` دریافت می‌کند.

## اجرای تغییرات دیتابیس

از پوشه `backend`:

```bash
npm install
npx prisma generate
npx prisma db push
# در محیط توسعه در صورت نیاز:
npx tsx prisma/seed.ts
npm run build
npm run start:dev
```

اگر Migrationهای versioned استفاده می‌کنید به‌جای `db push`:

```bash
npx prisma migrate dev --name add-production-flow-engine
```

## اجرای Frontend

از پوشه `frontend`:

```bash
npm install
npm run build
npm run dev
```

مسیر UI:

```text
/dashboard/production
```

صفحه هر Run:

```text
/dashboard/production/runs/:id
```

## سناریوی تست کامل

1. با Super Admin وارد شوید.
2. مطمئن شوید حداقل ۳ Form فعال و چند User دارید.
3. از منوی «تولید» وارد شوید و «ساخت Flow جدید» را بزنید.
4. سه مرحله ایجاد کنید:
   - مرحله ۱: Form A، مسئول User A، ناظر User B، تأییدکننده User C.
   - مرحله ۲: Form B، مسئول User B و فقط تأییدکننده User C.
   - مرحله ۳: Form C، مسئول User A و بدون ناظر/تأییدکننده.
5. Flow را ذخیره کنید و «شروع تولید» را بزنید.
6. Run ساخته می‌شود؛ فقط Step 1 باید `READY` باشد و بقیه `LOCKED`.
7. با User A وارد شوید. در «کارهای من» Step 1 را ببینید و فرم را ثبت کنید.
8. وضعیت Step 1 باید `WAITING_SUPERVISOR` شود.
9. با User B وارد شوید. Task نظارت را باز کنید و یک‌بار Reject کنید.
10. با User A دوباره فرم را اصلاح و ارسال کنید.
11. User B این بار Approve کند؛ وضعیت باید `WAITING_APPROVAL` شود.
12. User C Approve کند؛ Step 1 باید `COMPLETED` و Step 2 باید `READY` شود.
13. Step 2 را مشابه ادامه دهید.
14. Step 3 چون Reviewer ندارد با Submit مستقیماً `COMPLETED` می‌شود.
15. در پایان Run باید `COMPLETED` و Progress برابر `100%` باشد.

## فایل‌های اصلی اضافه/تغییرکرده

Backend:

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/app.module.ts`
- `backend/src/production/production.module.ts`
- `backend/src/production/production.controller.ts`
- `backend/src/production/production.service.ts`
- `backend/src/production/dto/production.dto.ts`

Frontend:

- `frontend/src/lib/api/production.ts`
- `frontend/src/features/production/ProductionPage.tsx`
- `frontend/src/features/production/ProductionRunPage.tsx`
- `frontend/src/app/dashboard/production/page.tsx`
- `frontend/src/app/dashboard/production/runs/[id]/page.tsx`
- `frontend/src/components/layout/SidebarNav.tsx`
- `frontend/src/styles/globals.css`

## نکته درباره ویرایش Flow

برای حفظ Audit و تاریخچه، اگر یک Flow حداقل یک Run داشته باشد، ساختار مراحل آن مستقیماً قابل بازنویسی نیست. در این حالت بهتر است Flow قبلی غیرفعال و نسخه جدید ساخته شود. Runهای قبلی همیشه Snapshot مرحله‌های زمان شروع خود را حفظ می‌کنند.

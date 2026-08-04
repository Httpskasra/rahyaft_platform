# Recruitment Module

این پیاده‌سازی فرم‌های استخدام را از `Form` و `FormSubmission` موجود مستقل می‌کند.

## مرزها
- مدل‌ها و APIهای Recruitment مستقل هستند.
- `SharedFormRenderer` و قرارداد schema در `frontend/src/components/forms` قابل استفاده توسط هر دو دامنه است.
- فرم منتشرشده immutable است و تغییرات با version جدید انجام می‌شود.
- انتقال مرحله فقط از action endpointها انجام می‌شود.
- مصاحبه فنی فقط توسط کاربر assign‌شده قابل ثبت است.
- ایجاد کاربر در تراکنش نهایی و با نقش `user` انجام می‌شود.

## اجرا
```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate dev --name add_independent_recruitment
npm run build

cd ../frontend
npm ci
npm run build
```

## Permissionها
- read:recruitment-applications
- review-initial:recruitment-applications
- conduct-initial-interview:recruitment-applications
- assign-technical-interviewer:recruitment-applications
- conduct-technical-interview:recruitment-interviews
- final-approve:recruitment-applications
- manage:recruitment-settings

## Public routes
- GET `/api/v1/public/recruitment/jobs`
- GET `/api/v1/public/recruitment/jobs/:slug`
- POST `/api/v1/public/recruitment/jobs/:slug/applications`
- GET `/api/v1/public/recruitment/applications/:trackingCode/:token`

## Production notes
قبل از انتشار عمومی، CAPTCHA/Turnstile، OTP متقاضی، object storage و malware scan برای فایل رزومه، Outbox event و retention policy اضافه شود. API فعلی توکن پیگیری تصادفی و hash‌شده دارد اما OTP عمومی هنوز به‌عنوان integration بعدی باقی مانده است.

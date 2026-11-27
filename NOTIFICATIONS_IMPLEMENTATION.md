# Global Notifications — پیاده‌سازی اعلان‌های سراسری

## قابلیت‌های اضافه‌شده

- ماژول مستقل `NotificationsModule` در بک‌اند.
- جدول `AppNotification` برای نگهداری اعلان هر کاربر.
- APIهای زیر:
  - `GET /api/v1/notifications/summary`
  - `GET /api/v1/notifications`
  - `PATCH /api/v1/notifications/:id/read`
  - `PATCH /api/v1/notifications/read/all`
- آیکن زنگ سراسری در Header با Badge تعداد خوانده‌نشده‌ها.
- Dropdown آخرین اعلان‌ها با لینک مستقیم به رکورد مربوطه.
- صفحه کامل `/dashboard/notifications` با فیلتر دسته‌بندی و فقط خوانده‌نشده‌ها.
- گزینه «اعلان‌ها» در Sidebar.

## رویدادهایی که اکنون اعلان ایجاد می‌کنند

### فرم‌ها و تأییدها
- ثبت فرم دارای Approval Policy → اعلان برای کاربران Role مرحله اول.
- رفتن فرم به مرحله تأیید بعدی → اعلان برای کاربران Role مرحله بعد.
- تأیید نهایی فرم → اعلان برای ثبت‌کننده فرم.
- رد فرم → اعلان برای ثبت‌کننده فرم همراه دلیل رد.

### تعمیرات
- Assign شدن پرونده تعمیر به تکنسین.
- تغییر وضعیت پرونده تعمیر → اعلان برای تکنسین مسئول، اگر تغییر توسط شخص دیگری انجام شده باشد.

### تولید
- ایجاد Run جدید → اعلان برای مسئول مرحله اول.
- Submit مرحله → اعلان برای Supervisor یا Approver.
- رد مرحله → اعلان اصلاح برای Assignee.
- تأیید مرحله → اعلان برای Assignee.
- فعال شدن مرحله بعدی → اعلان برای Assignee مرحله بعد.
- رسیدن محصول به QC نهایی → اعلان برای مسئول QC.
- Pass/Fail شدن QC → اعلان برای آغازکننده Run.

### ارتباطات سازمانی
اعلان‌های داخلی فعلی Communication حفظ شده‌اند و همزمان به سیستم اعلان سراسری Mirror می‌شوند:
- پیام جدید
- Mention
- Assignment
- اضافه شدن به Thread
- Attachment جدید
- ایجاد Thread و اضافه/Assign شدن کاربران

## Migration
Migration جدید:

`backend/prisma/migrations/20261017023000_global_notifications/migration.sql`

در محیط Docker/Production طبق روال فعلی پروژه migration را اجرا کنید. اگر کانتینر migrate دارید، با rebuild/up همان migration جدید اعمال می‌شود. در اجرای دستی Prisma:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

برای محیط توسعه‌ای که از `migrate dev` استفاده می‌کند:

```bash
npx prisma generate
npx prisma migrate dev
```

## تست پیشنهادی

1. با کاربر A یک فرم دارای Approval Policy ثبت کنید؛ کاربر دارای Role تأییدکننده باید Badge و اعلان جدید ببیند.
2. فرم را تأیید/رد کنید؛ ثبت‌کننده باید اعلان تغییر وضعیت بگیرد.
3. یک Repair را به تکنسین Assign کنید؛ تکنسین باید اعلان دریافت کند.
4. وضعیت Repair را با کاربر دیگر عوض کنید؛ تکنسین مسئول باید اعلان تغییر وضعیت بگیرد.
5. یک Production Run بسازید؛ مسئول مرحله اول باید اعلان داشته باشد.
6. مرحله را Submit کنید؛ Supervisor/Approver باید اعلان بگیرد.
7. یک پیام یا Mention در Communication بفرستید؛ اعلان باید هم در سیستم Communication و هم در زنگ سراسری دیده شود.
8. روی اعلان کلیک کنید؛ باید به فرم/تعمیر/تولید/گفتگوی مربوطه هدایت شود.
9. «خواندن همه» را بزنید؛ Badge باید صفر شود.

## نکته معماری

سیستم جدید Generic است و برای ماژول‌های بعدی کافی است `NotificationsService` تزریق شود و `create` یا `notifyUsers` صدا زده شود. بنابراین برای Attendance، Recruitment، Customer/Sales یا SLA alertها می‌توان بدون تغییر UI سیستم اعلان، Event جدید اضافه کرد.

# RBAC / Permission Audit Changes

## اصلاحات اصلی
- یک Permission Catalog مرکزی در backend اضافه شد تا action/resourceهای معتبر مشخص و قابل کنترل باشند.
- `RequirePermission` اکنون action/resourceهای نامعتبر را در زمان TypeScript compile تشخیص می‌دهد.
- API نقش‌ها دیگر permission دلخواه/اشتباه خارج از catalog را قبول نمی‌کند.
- `customers` از حالت موقت `@Public()` خارج و کاملاً پشت JWT + permission قرار گرفت.
- permission جداگانه و تکراری `organization-chart` حذف شد؛ چارت سازمانی با `read:departments` کنترل می‌شود.
- تخصیص/حذف نقش از کاربر از `update:roles` به `assign:roles` تفکیک شد.
- تخصیص تعمیر از `update:repairs` به `assign:repairs` تفکیک شد.
- عملیات تولید از `update:production-runs` تفکیک شد: `execute`, `supervise`, `approve`, `qc`.
- CRM دارای actionهای مستقل برای مخاطبان، فرصت‌های فروش، فعالیت و AI شد.
- permissionهای Recruitment که قبلاً در UI مدیریت نقش‌ها دیده نمی‌شدند به frontend اضافه شدند.
- permissionهای frontend با backend همگام شدند و actionهای جدید label مناسب فارسی دارند.
- برای resourceهای تنظیماتی/سراسری در UI، scope به `ORG_WIDE` هدایت می‌شود تا SELF/Department گمراه‌کننده نباشد.

## seed.ts
- فقط یک Department ریشه با UUID معتبر ایجاد/به‌روزرسانی می‌شود:
  `00000000-0000-4000-8000-000000000001`
- فقط یک کاربر Super Admin با شماره `09164532683` ایجاد/به‌روزرسانی می‌شود.
- فقط role اصلی `superadmin` توسط این seed ایجاد می‌شود.
- Super Admin تمام permissionهای واقعی catalog را با scope `ORG_WIDE` دریافت می‌کند.
- دیگر role عمومی `user` و داده کارمند عادی توسط `seed.ts` ساخته نمی‌شود.

## نکته Scope
PermissionGuard برای routeهای دارای `userId` scope را مستقیماً ارزیابی می‌کند و بعضی domainها مانند Communication/Repairs نیز `matchedPermission` را در service مصرف می‌کنند. برای domainهایی که ownership/department باید روی query داده اعمال شود، فیلتر scope باید در service مربوطه نیز لحاظ شود؛ صرف وجود Scope در RolePermission برای فیلتر خودکار رکوردهای هر مدل کافی نیست.

## Validation انجام‌شده
- تمام `@RequirePermission`های backend با Permission Catalog تطبیق داده شدند؛ مورد ناشناخته باقی نمانده است.
- تمام فایل‌های TS/TSX با TypeScript transpile syntax check شدند و خطای syntax/JSX وجود ندارد.
- build کامل npm در محیط اجرا انجام نشد چون dependencyها در ZIP نصب نبودند و `npm ci` در محیط sandbox timeout شد.

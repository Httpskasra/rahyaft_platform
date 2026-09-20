# توسعه بخش حضور و غیاب و گزارش‌گیری

## تغییرات اصلی

### Backend
- فیلتر بر اساس `departmentId` به `AttendanceQueryDto` اضافه شد.
- خروجی `daily-summary` اکنون شامل نام دپارتمان، مدت حضور محاسبه‌شده، ورود دیرتر از مبنا، خروج زودتر و ثبت ناقص است.
- endpoint جدید زیر اضافه شد:

```http
GET /attendance/report
```

پارامترهای قابل استفاده:

```text
from
to
search
departmentId
userId
```

گزارش شامل موارد زیر است:
- KPIهای کلی
- روند روزانه
- آمار به تفکیک دپارتمان
- آمار به تفکیک شخص
- رکوردهای روزانه
- لیست دپارتمان‌ها برای فیلتر

### Frontend
صفحه زیر از لیست ساده به داشبورد تحلیلی تبدیل شد:

```text
/dashboard/attendance/list
```

قابلیت‌ها:
- جستجو بر اساس نام شخص
- فیلتر بازه زمانی با تقویم فارسی
- فیلتر دپارتمان
- KPIهای حضور
- نمودار روند حضور روزانه
- نمودار مقایسه دپارتمان‌ها
- نمودار موارد نیازمند بررسی
- تب گزارش روزانه
- تب گزارش اشخاص
- تب گزارش دپارتمان‌ها
- رفتن به جزئیات تردد هر شخص/روز
- خروجی CSV بر اساس فیلتر جاری
- پشتیبانی Dark Mode و RTL

## تعریف فعلی شاخص‌ها

تا زمانی که ماژول Shift/Work Schedule به پروژه اضافه نشده است:

- `Worked Time`: فاصله اولین تا آخرین تردد ثبت‌شده در روز
- `Late Arrival`: اولین تردد بعد از 08:30
- `Early Departure`: آخرین تردد قبل از 16:00
- `Incomplete`: کمتر از دو تردد در یک روز

این مقادیر در ابتدای فایل زیر قابل تغییر هستند:

```text
backend/src/attendance/attendance.service.ts
```

```ts
const LATE_AFTER_HOUR = 8;
const LATE_AFTER_MINUTE = 30;
const EARLY_BEFORE_HOUR = 16;
const EARLY_BEFORE_MINUTE = 0;
```

## تست Backend

```bash
cd backend
npm install
npm run start:dev
```

سپس:

```http
GET /attendance/report
GET /attendance/report?from=2026-09-01&to=2026-09-30
GET /attendance/report?search=علی
GET /attendance/report?departmentId=<DEPARTMENT_UUID>
```

کاربر باید permission زیر را داشته باشد:

```text
read:attendance
```

## تست Frontend

```bash
cd frontend
npm install
npm run dev
```

صفحه:

```text
/dashboard/attendance/list
```

سناریوهای تست:
1. بدون فیلتر صفحه را باز کنید و KPIها و نمودارها را بررسی کنید.
2. فقط یک روز را انتخاب کنید.
3. یک بازه چندروزه انتخاب کنید.
4. نام یک کارمند را جستجو کنید.
5. یک دپارتمان انتخاب کنید.
6. نام + دپارتمان + تاریخ را همزمان فیلتر کنید.
7. تب «اشخاص» را بررسی کنید.
8. تب «دپارتمان‌ها» را بررسی کنید.
9. روی دکمه جزئیات یک رکورد روزانه بزنید.
10. CSV خروجی بگیرید و محتوای آن را بررسی کنید.

## مرحله پیشنهادی بعدی
برای اینکه «غیبت»، «اضافه‌کاری»، «کم‌کاری»، «مرخصی» و «تاخیر» به شکل رسمی و دقیق محاسبه شوند، بهتر است مدل‌های زیر در فاز بعد اضافه شوند:
- WorkShift
- EmployeeShiftAssignment
- WorkCalendar / Holidays
- LeaveRequest
- AttendanceAdjustment

بعد از آن گزارش‌ها می‌توانند مقدار مورد انتظار حضور را با مقدار واقعی مقایسه کنند.

# مستند تغییرات تاریخ جلالی و فرم مشتریان

## هدف تغییرات

در این به‌روزرسانی، ورودی‌ها و نمایش تاریخ در بخش‌های مرتبط فرانت‌اند به تقویم جلالی تبدیل شده‌اند و فیلدهای Enum مربوط به مشتریان به‌جای ورودی متنی، با `Select` نمایش داده می‌شوند.

## خلاصه تغییرات

1. ایجاد یک کامپوننت مشترک برای انتخاب تاریخ شمسی.
2. تبدیل ورودی‌های `date` و `datetime-local` شناسایی‌شده به تقویم جلالی.
3. حفظ فرمت مناسب تاریخ هنگام ارسال اطلاعات به API.
4. تبدیل فیلدهای Enum مشتریان به Select Box.
5. افزودن تمام گزینه‌های گروه شغلی مشتری مطابق Enumهای بک‌اند.
6. تبدیل فیلترهای تاریخ بخش تردد به تقویم جلالی.

---

## فایل جدید

### `frontend/src/components/ui/PersianDatePicker.tsx`

یک کامپوننت عمومی و قابل استفاده مجدد برای تاریخ شمسی ایجاد شده است.

ویژگی‌ها:

- استفاده از تقویم فارسی و Locale فارسی.
- امکان انتخاب فقط تاریخ.
- امکان انتخاب تاریخ همراه با ساعت.
- پشتیبانی از مقدار خالی.
- پشتیبانی از حالت غیرفعال.
- امکان تعیین Placeholder.
- تبدیل مقدار انتخاب‌شده به فرمت مناسب جهت نگهداری در State و ارسال به API.
- هماهنگی ظاهری با Inputهای فعلی پروژه.

نمونه استفاده برای تاریخ ساده:

```tsx
<PersianDatePicker
  value={form.birthDate}
  onChange={(value) => set("birthDate", value)}
  placeholder="تاریخ تولد"
/>
```

نمونه استفاده برای تاریخ و ساعت:

```tsx
<PersianDatePicker
  value={form.nextFollowUpAt}
  onChange={(value) =>
    setForm({ ...form, nextFollowUpAt: value || undefined })
  }
  enableTime
  placeholder="تاریخ پیگیری بعدی"
/>
```

---

## تغییرات صفحه مشتریان

### فایل

`frontend/src/app/dashboard/customers/page.tsx`

### تاریخ تولد مشتری

ورودی تاریخ تولد از Input معمولی تاریخ به `PersianDatePicker` تبدیل شد.

کاربر تاریخ را به‌صورت شمسی انتخاب می‌کند، اما مقدار موردنیاز برای ارتباط با بک‌اند به‌صورت کنترل‌شده مدیریت می‌شود.

### جنسیت مشتری

فیلد `gender` به Select تبدیل شد.

گزینه‌ها:

- مرد: `MALE`
- زن: `FEMALE`

### گروه شغلی مشتری

فیلد `occupationGroup` به Select تبدیل شد و گزینه‌های زیر به آن اضافه شدند:

- تکنسین کاشت مو: `HAIR_TRANSPLANT_TECHNICIAN`
- ناخن‌کار: `NAIL_TECHNICIAN`
- پزشک عمومی: `GENERAL_PRACTITIONER`
- پزشک: `PHYSICIAN`
- کلینیک پوست و مو و زیبایی: `HAIR_BEAUTY_CLINIC`
- مشتری دستگاه خانگی: `HOME_DEVICE_CUSTOMER`
- آرایشگر: `BARBER`
- دندان‌پزشک: `DENTIST`
- دامپزشک: `VETERINARIAN`
- همکار: `COLLEAGUE`
- کارمند: `EMPLOYEE`
- متخصص پوست: `DERMATOLOGIST`
- متخصص زنان: `GYNECOLOGIST`
- سایر: `OTHER`

### نوع مشتری

فیلد نوع مشتری به‌صورت Select نگهداری شده است:

- شخص حقیقی: `PERSON`
- سازمان: `ORGANIZATION`

### وضعیت مشتری

فیلد وضعیت مشتری به‌صورت Select نگهداری شده است:

- فعال: `ACTIVE`
- غیرفعال: `INACTIVE`
- لیست سیاه: `BLACKLISTED`

### تاریخ‌های فرصت فروش

فیلدهای زیر به تقویم شمسی همراه با انتخاب ساعت تبدیل شدند:

- `expectedCloseAt`: تاریخ احتمالی نهایی‌شدن فرصت فروش
- `nextFollowUpAt`: تاریخ پیگیری بعدی

### سایر Enumهای فرم مشتریان

فیلدهای زیر نیز به‌صورت Select استفاده می‌شوند:

- نوع فعالیت مشتری
- وضعیت فرصت فروش
- اولویت فرصت فروش

این کار از ارسال مقادیر نامعتبر به بک‌اند جلوگیری می‌کند.

---

## تغییرات بخش تردد

### فایل‌ها

- `frontend/src/app/dashboard/attendance/list/page.tsx`
- `frontend/src/app/dashboard/attendance/[userId]/page.tsx`

فیلترهای ابتدا و انتهای بازه زمانی در هر دو صفحه از Input تاریخ مرورگر به `PersianDatePicker` تبدیل شدند.

نتیجه:

- کاربر بازه را با تاریخ شمسی انتخاب می‌کند.
- ظاهر تقویم در مرورگرهای مختلف یکسان است.
- وابستگی به Date Picker پیش‌فرض مرورگر حذف شده است.

---

## فایل‌های تغییرکرده

```text
frontend/src/components/ui/PersianDatePicker.tsx
frontend/src/app/dashboard/customers/page.tsx
frontend/src/app/dashboard/attendance/list/page.tsx
frontend/src/app/dashboard/attendance/[userId]/page.tsx
```

---

## کتابخانه مورد استفاده

برای تقویم شمسی از کتابخانه موجود در پروژه استفاده شده است:

```text
react-multi-date-picker
```

همچنین تقویم و Locale فارسی آن استفاده می‌شوند:

```tsx
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
```

بنابراین وابستگی جدیدی صرفاً برای این تغییرات به پروژه اضافه نشده است.

---

## رفتار تاریخ در فرانت‌اند و بک‌اند

نمایش و انتخاب تاریخ برای کاربر به‌صورت جلالی انجام می‌شود، اما تاریخ‌هایی که بک‌اند به شکل ISO یا میلادی انتظار دارد، پیش از ارسال به فرمت مناسب تبدیل می‌شوند.

این تفکیک ضروری است:

- رابط کاربری: تاریخ شمسی
- API و پایگاه داده: فرمت استاندارد قابل پردازش

نباید رشته تاریخ شمسی بدون تبدیل مستقیماً در فیلدی ذخیره شود که بک‌اند آن را به‌عنوان `DateTime` پردازش می‌کند.

---

## تست‌های پیشنهادی

پس از اجرای پروژه موارد زیر بررسی شوند:

1. ساخت مشتری حقیقی با تاریخ تولد شمسی.
2. انتخاب جنسیت و گروه شغلی و بررسی Payload درخواست.
3. ویرایش مشتری و نمایش صحیح مقادیر Selectها.
4. ایجاد فرصت فروش با تاریخ نهایی‌شدن و پیگیری بعدی.
5. بررسی نمایش صحیح تاریخ فرصت فروش بعد از دریافت از API.
6. فیلتر گزارش تردد با یک بازه تاریخ شمسی.
7. پاک‌کردن مقدار Date Picker و بررسی عدم ارسال مقدار نامعتبر.
8. بررسی تقویم در موبایل و دسکتاپ.

---

## اجرای فرانت‌اند

```bash
cd frontend
npm install
npm run dev
```

برای بررسی TypeScript و Build:

```bash
npm run build
```

در صورت استفاده از Docker، سرویس فرانت‌اند را مجدداً Build کنید:

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml build frontend
docker compose --env-file .env.development -f docker-compose.dev.yml up -d frontend
```

## نکته نهایی

برای فیلدهای تاریخ جدیدی که بعداً به پروژه اضافه می‌شوند، بهتر است به‌جای `input type="date"` یا `input type="datetime-local"` از کامپوننت مشترک `PersianDatePicker` استفاده شود تا نمایش، تبدیل مقدار و تجربه کاربری در کل سامانه یکسان باقی بماند.

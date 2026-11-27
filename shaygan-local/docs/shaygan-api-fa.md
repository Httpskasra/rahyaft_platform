# راهنمای قرارداد وب‌سرویس شایگان

## وضعیت اعتبار

این سند از بازنگری ۲۷ راهنمای ۱۰۱ صفحه‌ای شایگان استخراج شده است. در این مرحله قراردادها `documented-only` هستند و live test نشده‌اند. اختلاف‌های آینده بدون پنهان‌سازی در `live-vs-documented-diff.md` ثبت می‌شوند.

## معماری ارتباط

Client درخواست HTTP `POST` را به `/api/<endpoint>` می‌فرستد. وب‌سرویس شایگان باید جداگانه به SQL Server دسترسی داشته باشد؛ SQL instance آدرس HTTP نیست. تمام گزارش‌های خواندنی نیز POST هستند (صفحه ۱۱ و ۱۵).

بدنه خواندن:

```json
{"Config":{"Server":"...","DBUserName":"...","DBPassword":"...","DataBaseName":"CY000401","AllowRowSecurity":false,"Level":0,"AuthUser":"...","AuthPassword":"...","StartVersion":null,"EndVersion":null},"Domain":{}}
```

صفحه‌بندی در query string است: `?RowStart=0&RowCount=2`. صفحه ۱۵ برای Account سقف ۱۰۰ و Invoice سقف ۲۰ را مثال می‌زند. پاسخ مستند خواندن شامل `Result`, `ErrorMessage`, `CurrentVersion` است (صفحه ۱۴).

بدنه نوشتن:

```json
{"Put":{"Config":{},"PutObject":[{"GuId":"...","UpdateKind":0}]}}
```

`UpdateKind`: ایجاد ۰، ویرایش ۱، حذف ۲، ایجاد/ویرایش ۳، بدون تغییر ۴ (صفحه ۱۲). تاریخ با هشت رقم و بدون `/` یا `-` و به‌صورت شمسی یا میلادی مستند شده است (صفحه ۱۳). نوشتن زنده در این پروژه ممنوع است.

## endpointها

۱۹ endpoint خواندنی صفحات ۵۷ و ۵۸ و ۱۰ endpoint نوشتنی یکتا در صفحه ۵۹ قرار دارند. inventory ماشینی در `src/endpoints.ts` و spec کامل در `openapi/shaygan.openapi.yaml` نگهداری می‌شود. مسیر `api/invoicepayment/` با slash پایانی و املای `Cheque/PutRecievable` عیناً از PDF آمده و تا تست زنده قطعی نیست.

## خطا و serialization

وجود `ErrorMessage` در wrapper مستند است، اما HTTP status، content type دقیق، null-vs-missing، casing واقعی، encoding، خطاهای validation و correlation headerها تا capture زنده ناشناخته‌اند. mock این موارد را ادعای parity نمی‌کند.

## curl خواندنی

برای جلوگیری از نشت secret، body را از فایل محلی gitignored بخوانید:

```powershell
curl.exe -X POST "$env:SHAYGAN_API_BASE_URL/api/Account/Get?RowStart=0&RowCount=2" -H "Content-Type: application/json" --data-binary "@request.local.json"
```

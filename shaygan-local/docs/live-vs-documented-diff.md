# Live versus documented differences

Live capture هنوز اجرا نشده است؛ بنابراین اختلاف اثبات‌شده‌ای وجود ندارد.

مواردی که باید در اولین اتصال LAN بررسی شوند:

- در دسترس بودن HTTP API روی base URL تنظیم‌شده و وجود احتمالی port/path اضافه.
- slash پایانی و casing مسیر `api/invoicepayment/`.
- املای واقعی `Cheque/PutRecievable`؛ تست زنده نوشتنی انجام نمی‌شود و صرفاً route discovery غیرمخرب در صورت امکان بررسی خواهد شد.
- شکل null/missing، HTTP status و content type خطاها.
- `CurrentVersion` و نوع serialization عدد اعشاری و تاریخ.
- سقف pagination هر گزارش به‌جز مثال‌های Account=100 و Invoice=20.

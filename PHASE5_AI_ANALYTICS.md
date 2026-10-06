# Phase 5 — AI Analytics

این فاز AI را روی خروجی قابل اتکای Phase 1 تا 4 قرار می‌دهد. مدل به دیتابیس یا SQL دسترسی مستقیم ندارد و فقط KPI، Trend، SLA، Rule Insights، Anomaly و آمار تجمیعی را دریافت می‌کند.

## قابلیت‌های اضافه‌شده

### Forms overview
- `POST /forms/analytics/ai-summary?range=30d`
- `POST /forms/analytics/ask?range=30d`
- تحلیل مدیریتی همه فرم‌ها
- Ask Analytics روی KPIهای تجمیعی و Rule Insightها

### Single form
- `POST /forms/:id/analytics/ai-summary?range=30d`
- `POST /forms/:id/analytics/ask?range=30d`
- تحلیل Approval Funnel، Bottleneck، Field Analytics و SLA
- سؤال آزاد مدیریتی بر اساس داده همان فرم

### Repairs
- `POST /repairs/analytics/ai-summary?range=30d`
- `POST /repairs/analytics/ask?range=30d`
- تحلیل MTTR، Lead Time، Aging، Status Duration، SLA، Visit و Workload

## معماری

```text
Database
   ↓
Analytics Engine (Phase 1-3)
   ↓
Insight + Anomaly Engine (Phase 4)
   ↓
Privacy Sanitizer
   ↓
AI Analytics Service
   ↓
Summary / Findings / Recommendations / Ask Analytics
```

AI هیچ KPI را خودش محاسبه نمی‌کند. محاسبات اصلی در Backend انجام می‌شوند.

## Privacy

پیش‌فرض:

```env
AI_ANALYTICS_INCLUDE_IDENTIFIERS=false
```

در این حالت:
- پاسخ خام فرم ارسال نمی‌شود.
- متن توضیحات/مشکل مشتری ارسال نمی‌شود.
- شماره تلفن ارسال نمی‌شود.
- case id و submission id ارسال نمی‌شوند.
- تکنسین‌ها برای مدل با `Technician 1`, `Technician 2`, ... نمایش داده می‌شوند.

اگر مدل کاملاً داخلی/Local است و سیاست سازمان اجازه می‌دهد، می‌توان مقدار را `true` کرد.

## Provider configuration

### OpenAI-compatible API

در `.env` Backend یا root compose environment:

```env
AI_ANALYTICS_BASE_URL=https://YOUR_PROVIDER_OPENAI_COMPATIBLE_BASE/v1
AI_ANALYTICS_API_KEY=YOUR_KEY
AI_ANALYTICS_MODEL=YOUR_MODEL
AI_ANALYTICS_LANGUAGE=fa
AI_ANALYTICS_TIMEOUT_MS=45000
AI_ANALYTICS_INCLUDE_IDENTIFIERS=false
```

این ساختار برای providerهایی است که endpoint سازگار با `/chat/completions` دارند.

### Ollama fallback

اگر سه متغیر `AI_ANALYTICS_*` بالا تنظیم نشده باشند، سرویس از Ollama استفاده می‌کند:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
```

در Docker production مقدار پیش‌فرض base URL برابر `http://ollama:11434` است.

اگر هیچ provider قابل استفاده نباشد، Dashboard خطا نمی‌کند؛ پاسخ `available: false` نمایش داده می‌شود و Analytics فازهای قبلی همچنان کار می‌کنند.

## UI

AI panel به این صفحات اضافه شده است:

```text
/dashboard/forms/analytics
/dashboard/forms/manage/{FORM_ID}/analytics
/dashboard/repairs/reports
```

هر Panel شامل:
- دکمه `تحلیل AI`
- Ask Analytics
- Summary / Answer
- Findings با severity
- Recommendations با priority
- نام model و توضیح grounding

## نمونه سؤال‌ها

Forms:

```text
چرا زمان تأیید در این بازه بالا رفته؟
کدام مرحله بیشترین گلوگاه را ایجاد کرده؟
آیا افزایش نرخ رد معنی‌دار است؟
کدام فیلدها کیفیت تکمیل پایینی دارند؟
برای کاهش SLA breach چه اقداماتی پیشنهاد می‌شود؟
```

Repairs:

```text
چرا MTTR افزایش پیدا کرده؟
بیشترین اتلاف زمان در کدام status است؟
آیا backlog قدیمی مشکل جدی است؟
چه عواملی هم‌زمان با افت SLA دیده می‌شوند؟
چگونه نرخ مراجعه دوم را کاهش دهیم؟
```

## Grounding rules

System Prompt مدل را مجبور می‌کند:
1. فقط از context داده‌شده استفاده کند.
2. عدد جدید نسازد.
3. correlation را به عنوان causation بیان نکند.
4. وقتی evidence کافی نیست، این موضوع را ذکر کند.
5. Recommendation را به evidence وصل کند.
6. خروجی JSON ساختاریافته بدهد.

## Response structure

```json
{
  "available": true,
  "provider": "openai-compatible",
  "model": "...",
  "summary": "...",
  "findings": [
    {
      "title": "...",
      "detail": "...",
      "severity": "warning"
    }
  ],
  "recommendations": [
    {
      "title": "...",
      "detail": "...",
      "priority": "high"
    }
  ],
  "answer": "...",
  "groundedMetrics": ["MTTR", "SLA compliance"]
}
```

## Database migration

Phase 5 migration جدید Prisma ندارد.

اگر Phase 3 migration قبلاً اعمال شده است، فقط:

```bash
cd backend
npm install
npx prisma generate
npm run build
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Test plan

### Test 1 — provider unavailable
1. متغیرهای AI و Ollama را خالی/غیرفعال کنید.
2. Analytics page را باز کنید.
3. `تحلیل AI` را بزنید.
4. باید پیام عدم تنظیم Provider نمایش داده شود و صفحه crash نکند.

### Test 2 — AI summary
1. Provider را تنظیم کنید.
2. وارد `/dashboard/repairs/reports` شوید.
3. بازه 30 روز را انتخاب کنید.
4. `تحلیل AI` را بزنید.
5. Summary، Findings و Recommendations باید بر اساس KPIهای همان بازه نمایش داده شوند.

### Test 3 — Ask Analytics
سؤال:

```text
چرا MTTR این بازه زیاد است؟
```

مدل نباید علت قطعی اختراع کند. اگر فقط همبستگی‌هایی مثل Status Duration یا Need Second Visit وجود دارد باید آن‌ها را به‌عنوان evidence/فرضیه توضیح دهد.

### Test 4 — privacy
با `AI_ANALYTICS_INCLUDE_IDENTIFIERS=false` درخواست outbound را در development log/proxy بررسی کنید. اطلاعات شخصی و raw submission data نباید در payload وجود داشته باشند.

### Test 5 — range consistency
AI را برای 7d و 90d اجرا کنید. پاسخ‌ها باید بر اساس context همان بازه تغییر کنند، چون Backend Analytics برای هر درخواست دوباره محاسبه می‌شود.

## فایل‌های اصلی جدید/تغییریافته

Backend:
- `src/analytics-ai/analytics-ai.module.ts`
- `src/analytics-ai/analytics-ai.service.ts`
- `src/analytics-ai/dto/ask-analytics.dto.ts`
- `src/forms/forms.controller.ts`
- `src/repairs/repairs.controller.ts`
- `src/app.module.ts`

Frontend:
- `src/components/analytics/AiAnalyticsPanel.tsx`
- `src/lib/api/analytics.ts`
- `src/lib/api/forms.ts`
- `src/lib/api/repairs.ts`
- Forms overview analytics page
- Form detail analytics page
- Repairs reports page

## Phase 5 completion criteria

- Rule Engine بدون AI همچنان مستقل کار کند.
- Provider outage باعث crash شدن Analytics نشود.
- AI به raw DB یا SQL دسترسی نداشته باشد.
- Ask Analytics روی داده همان range پاسخ دهد.
- داده‌های حساس به‌صورت پیش‌فرض به provider ارسال نشوند.
- Summary و Recommendation فقط بر اساس evidence موجود تولید شوند.

## AvalAI fix: Structured Outputs / Responses API

برای AvalAI تنظیم پیشنهادی:

```env
AI_ANALYTICS_BASE_URL=https://api.avalai.ir/v1
AI_ANALYTICS_API_KEY=YOUR_AVALAI_KEY
AI_ANALYTICS_MODEL=gpt-5.6-luna
AI_ANALYTICS_API_STYLE=auto
```

`auto` برای دامنه `avalai.ir` ابتدا `/responses` را با `text.format.type=json_schema` امتحان می‌کند و در صورت عدم پشتیبانی route/model به `/chat/completions` با Structured Output و سپس JSON mode fallback می‌کند.

نسخه قبلی تنها با prompt از مدل می‌خواست JSON بدهد. اگر مدل قبل/بعد JSON متن اضافی می‌داد یا خروجی ناقص بود، parser پیام `AI response was not valid JSON` می‌داد. نسخه جدید JSON را در سطح API enforce می‌کند و خطای واقعی provider/model/route را نیز در `provider`, `model` و `disclaimer` حفظ می‌کند.

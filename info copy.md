Now I have a clear picture of both files. Let me identify the issues and fix them:

1. **`forms/page.tsx` (CreateFormModal)**: Missing `radio` field type, no options for `select`/`radio`/`checkbox`, no field descriptions
2. **`forms/[id]/page.tsx` (SubmitFormPanel)**: No proper rendering for `radio`, no options list for `select`, checkbox is bare with no labelNow let me rewrite both form files with the improvements:Now update the `[id]/page.tsx` — the submission panel needs radio, proper select, multi-checkbox, and field descriptions:Now package only the two updated files:The zip contains only the 2 updated files. Here's a summary of what changed:

**`forms/page.tsx` — CreateFormModal:**
- Added `radio` as a new field type option (alongside text, number, textarea, select, checkbox)
- Added a **description** input for every field — a helper hint shown to users when filling the form
- Added an **OptionEditor** component that appears when the type is `select`, `radio`, or `checkbox` — lets you add/remove/edit each option inline
- When switching to an option-based type, one empty option is seeded automatically

**`forms/[id]/page.tsx` — SubmitFormPanel:**
- Extracted a dedicated `FieldRenderer` component that handles all types properly:
  - **`select`** → renders a `<select>` dropdown populated from `field.options`
  - **`radio`** → renders a vertical list of styled radio buttons from `field.options`
  - **`checkbox` with options** → renders a multi-select checkbox group (value stored as array)
  - **`checkbox` without options** → single boolean toggle (backward-compatible)
  - **`textarea`**, **`number`**, **`text`** → unchanged behavior
- Every field now shows its **description** as a small hint below the label







-----------------------------------------------------------------------
-----------------------------------------------------------------------
-----------------------------------------------------------------------
-----------------------------------------------------------------------




Let me read the full current state of the analytics code and API before building anything.Now I have the full picture. I understand exactly what data the backend produces. Let me now also check the submissions API endpoint and the frontend API client to know what data I can pull:Now I have everything. I know exactly what endpoints exist, what data the analytics worker produces, and what the current UI shows. Let me build a comprehensive analytics page.Now I have everything I need. Let me build the comprehensive analytics page — this is a major rewrite of `[id]/page.tsx` with rich charts, field breakdowns, submission timeline, AI insights, and business intelligence sections.Only `forms/[id]/page.tsx` was changed. Here's everything that's new:

**📊 KPI Row (4 cards at top)**
- Total responses + last 7 days count
- Unique users (detects repeat submitters)
- Average field fill rate with color coding
- Risk score from analytics worker with level label

**📅 Submission Timeline**
- 14-day bar chart built in pure SVG (no extra dependencies) — hover for exact count per day

**🎯 3-Column Analytics Detail**
- **Risk Gauge** — semicircle gauge showing score 0–100 with reasons list
- **Anomaly Detection** — shows Z-score per anomalous field, color-coded badge
- **Form Category + Sparkline** — quantitative/qualitative/mixed label + 14-day trend line

**🧠 Business Intelligence Panel**
Generates automatic insights based on your real data:
- Low fill rate → suggests simplifying fields
- Weakest field identified → recommends making it optional
- Week-over-week velocity change → growth or drop alert
- Anomaly detected → flags for manual review
- Peak submission hour → recommends best time for notifications
- Qualitative form with many submissions → recommends NLP focus

**🔬 Field Deep Analysis (expandable)**
Each field has a collapsible section showing:
- Fill rate progress bar with warning if < 60%
- Number fields: mean, min, max, standard deviation
- Select/Radio/Checkbox: horizontal frequency bars per option with percentages
- Text fields: unique count, most common answer, NLP sentiment + keywords

**📋 Last 10 Submissions Table**
Real data table with user name, timestamp, and first 3 field values




----------------------------------------
----------------------------------------
----------------------------------------




Let me read all the relevant code first before touching anything.Now I have the complete picture. Here's my plan:

**Analytics (Python worker):** Add `domain_classifier` (HR/Product/Survey/etc), `trend_analysis`, `choice_distribution`, `text_corpus_analysis`, `completion_health`, `predictions`, `per_submission_history` metrics.

**Backend (NestJS):** Add a new `GET /forms/:id/deep-analysis` endpoint that returns rich pre-computed insights + the raw submissions in one call.

**Frontend:** Complete rewrite of the analytics tab with domain-aware intelligence, rich charts, predictions, warnings, recommendations.Now let's build everything. Starting with the analytics Python layer:Now rewrite the worker to run all the new analyses:Now add the backend `deep-analysis` endpoint to expose all the new metrics:Now update the frontend API client to expose the new endpoint:Now the big one — the complete rewritten frontend analytics page:---

The zip contains **7 changed files**. Here's exactly what was done in each container:

---

### 🐍 Analytics (Python Worker)

**`domain_classifier.py`** *(new file)*
Detects the business domain of each form — **HR, Product, Survey, Support, Finance, Operations** — using keyword matching across the form name, description, and field labels (Persian + English). Then generates domain-specific outputs:
- **HR**: flags low performer scores, low completion of required fields, identifies most common choices
- **Product**: NPS score analysis, customer preference distribution, warns when scores are below 5
- **Survey**: highlights low-response questions (likely ambiguous), summarizes most popular answers
- **Support**: ticket volume warnings, priority distribution
- **Finance**: totals and averages of monetary fields, flags values >3× average as needing approval
- **Operations**: compliance rate per checkbox, flags below-50% as a serious issue

**`prediction_models.py`** *(rewritten)*
Added 5 new functions: `compute_trend_analysis` (weekly volume buckets + numeric field value trends), `compute_completion_health` (per-field fill rates, overall weighted score), `generate_predictions` (next-week volume + 95% confidence intervals per numeric field), `build_submission_history` (per-submission risk + completion for the timeline chart). Also enriched existing functions — stats now include **median, P25, P75, avg_length, distribution map** for choice fields.

**`worker.py`** *(rewritten)*
Now runs **13 analytics steps** per submission instead of 6. Steps 7–13 are all new: domain classification, domain insights, completion health, trend analysis, predictions, submission history. Fetches all historical submissions once per message for efficiency.

---

### 🏗️ Backend (NestJS)

**`forms.service.ts`** — Added `getDeepAnalysis()` which returns everything in one round-trip: form metadata, all submissions with user info, all analytics worker outputs organized by metric name, per-field rolling stats, and per-field NLP results.

**`forms.controller.ts`** — Added `GET /forms/:id/deep-analysis` endpoint wired to the new service method.

---

### ⚛️ Frontend

**`forms.ts`** (API client) — Full TypeScript types for all new data structures: `DeepAnalysis`, `DomainInsights`, `CompletionHealth`, `TrendAnalysis`, `Predictions`, `SubmissionHistoryItem`, `FieldRollingStats`, `NlpAnalysis`. Added `formsApi.getDeepAnalysis()`.

**`[id]/page.tsx`** *(complete rewrite)* — The analytics tab now:
- Shows a **domain banner** (HR 👥 / Product 📦 / Survey 📋 / etc.) with trend indicator
- **4 KPI cards**: total responses, unique users, completion health %, last risk score
- **Domain-specific KPI tiles** (e.g. average performance score for HR)
- **Weekly volume bar chart + sparkline** for 8 weeks
- **3-column row**: Risk gauge, Anomaly detection with expected ranges, Form type donut chart
- **Domain insights panel**: positive findings, warnings with severity, actionable recommendations with priority badges
- **Completion health section**: per-field fill rate bars color-coded excellent/good/warning/critical
- **Submission history chart**: colored bars per submission (height = completion, color = risk level), hover for details
- **Predictions section**: next-week volume forecast, per numeric field confidence intervals
- **Field accordion**: each field expands to show fill rate, numeric stats (mean/median/P25/P75/std), distribution bars for choice fields, donut for boolean checkboxes, NLP sentiment+keywords for text fields
- **Submissions table**: last 15 rows with user, date, first 4 field values






--------------------------------
--------------------------------
--------------------------------
--------------------------------



Good — I have the full picture. There are several real gaps to fix:

1. **NLP**: currently analyzes only the *latest* submission's text — it should analyze the **corpus of all text responses** per field and produce aggregate sentiment distribution, top keywords across all responses, and recent vs older sentiment trend
2. **`[id]/page.tsx`**: has unused imports (`Plus`, `Trash2`, `X`, `useMemo`) — TypeScript will warn/fail
3. **`nlp_analyzer.py`**: needs a `analyze_text_corpus()` function for aggregate analysis
4. **Worker**: NLP is called per-submission but never aggregated — the stored result is always just the last submission's text, not a corpus summary
5. **`forms/page.tsx`**: the `CreateFormModal` `handleSubmit` passes `fields` with `description` and `options` but the backend DTO doesn't know about them — need to verify the DTO accepts arbitrary schema JSON (it does, since schema is `Json` type in Prisma — fine)
6. **Frontend**: the `AnalyticsDashboard` references `useMemo` in the import but never uses itGood — schema is `Record<string, unknown>` so description/options/radio all pass through fine. Now fix all the issues:Now update the worker to use corpus analysis:Now update the backend service to expose `nlp_corpus` instead of `nlp_analysis`:Now update the frontend API types and the page to use `nlp_corpus` and remove unused imports:Now the final, clean frontend page — no unused imports, `nlpByField` typed as `NlpCorpus`, full corpus NLP panel:All consistent. Now package:**8 files changed.** Here's exactly what was fixed and added in this continuation:

---

### Bugs fixed

**`[id]/page.tsx`** — Removed all unused imports (`Plus`, `Trash2`, `X`, `useMemo`) that would cause TypeScript build warnings. Removed the unused `import type` for types that weren't referenced. Every import is now actually used.

**`nlp_analyzer.py`** — The old version analyzed only the *latest submission's text* and overwrote the result every time a new submission came in. This meant you'd only ever see one person's text analyzed. Fixed completely.

**`worker.py`** — The old pipeline stored `nlp_analysis` per submission (always the latest). The new pipeline stores `nlp_corpus` — a true aggregate across *all* historical responses for the field, updated every time a new submission arrives.

**`forms.service.ts`** — Updated the metric key lookup from `nlp_analysis` → `nlp_corpus` so the new aggregate data flows through correctly.

**`forms.ts`** (API types) — Replaced `NlpAnalysis` (single response) with `NlpCorpus` (aggregate), with all the new fields properly typed.

---

### What `nlp_analyzer.py` now does

**`analyze_text_corpus(texts)`** — the new aggregate function:
- **Sentiment distribution** — counts of positive / negative / neutral across all responses
- **Dominant sentiment** — which sentiment wins overall
- **Sentiment score** — a float from −1.0 to +1.0 (negative = mostly unhappy, positive = mostly happy)
- **Top keywords** — most frequent meaningful words across *all* responses, not just one
- **Average word count** — how detailed responses tend to be
- **Short response rate** — % of answers with fewer than 5 words (low-effort flag)
- **Sample positive / negative** — real example quotes from actual responses
- **Recent sentiment trend** — compares the last third of responses vs the first third: `improving`, `declining`, or `stable`

---

### What the frontend now shows for NLP

**Per field (accordion):** Full `NlpCorpusPanel` showing sentiment distribution (3 boxes with counts + %), a bidirectional sentiment score bar (left = negative, right = positive, center = neutral), short response rate, all top keywords as chips, and real sample quotes color-coded green/red.

**Summary panel at bottom:** One-line per text field showing its sentiment score as a bar, making it easy to compare which fields are polarizing vs positive vs neutral at a glance.
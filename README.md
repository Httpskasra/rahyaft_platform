# Enterprise Platform

Full-stack platform with **NestJS backend**, **Next.js dashboard**, **Python analytics worker**, and **RabbitMQ** for async form analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Next.js     │───▶│  NestJS      │───▶│ PostgreSQL   │  │
│  │  Frontend    │    │  Backend     │    │  (Prisma)    │  │
│  │  :3001       │    │  :3000       │    │  :5432       │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│                             │                               │
│                             │ publish                       │
│                             ▼                               │
│                      ┌──────────────┐                       │
│                      │  RabbitMQ    │                       │
│                      │  :5672       │                       │
│                      │  UI: :15672  │                       │
│                      └──────┬───────┘                       │
│                             │ consume                       │
│                             ▼                               │
│                      ┌──────────────┐                       │
│                      │  Python      │                       │
│                      │  Analytics   │                       │
│                      │  Worker      │                       │
│                      └──────────────┘                       │
│                             │                               │
│                    ┌────────┴────────┐                      │
│                    ▼                 ▼                      │
│             ┌──────────┐    ┌──────────────┐               │
│             │ FormStat │    │ FormAnalysis │               │
│             └──────────┘    └──────────────┘               │
│                                                             │
│  ┌──────────────┐                                           │
│  │  Redis       │  (OTP, rate-limit, token cache)           │
│  │  :6379       │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3001 | Dashboard UI |
| Backend (NestJS) | 3000 | REST API (`/api/v1`) |
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | OTP & rate limiting |
| RabbitMQ | 5672 / 15672 | Message broker / Management UI |
| Analytics Worker | — | Python async processor |

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your values

# 2. Start dev environment (hot-reload)
make dev

# 3. Run database migrations (first time)
make migrate

# 4. (Optional) Seed initial data
make seed
```

## New Features Added

### Backend (NestJS)
- **`/api/v1/forms`** — CRUD for dynamic forms (schema-driven)
- **`/api/v1/form-submissions`** — Submit and retrieve form responses
- **`/api/v1/forms/:id/stats`** — Aggregated stats + AI analysis per form
- **`RabbitMQModule`** — Global, graceful-degradation publish service
- **`FormAnalysis` table** — Stores AI insights (risk, anomaly, NLP, category)

### Analytics Worker (Python)
- **Rolling field stats** → `FormStat` (count, avg, min, max, std, top value)
- **NLP analysis** on text fields (sentiment, keywords, summary, word count)
- **Risk scoring** — rule-based, scores missing fields & suspicious values
- **Anomaly detection** — Z-score based outlier detection per numeric field
- **Form categorization** — quantitative / qualitative / mixed

### Frontend (Next.js)
- **`/dashboard/forms`** — List, create, and manage forms
- **`/dashboard/forms/:id`** — Live analytics dashboard + submission panel
- **Forms sidebar item** added to navigation

## API Permissions Required

Add these permissions to your roles via `/api/v1/roles/:id/permissions`:

```json
{ "action": "create", "resource": "forms", "scope": "ORG_WIDE" }
{ "action": "read",   "resource": "forms", "scope": "ORG_WIDE" }
{ "action": "update", "resource": "forms", "scope": "ORG_WIDE" }
{ "action": "delete", "resource": "forms", "scope": "ORG_WIDE" }
{ "action": "create", "resource": "form-submissions", "scope": "ORG_WIDE" }
{ "action": "read",   "resource": "form-submissions", "scope": "ORG_WIDE" }
```

## RabbitMQ Management UI

Visit **http://localhost:15672** (user: `user`, pass: `pass`) to:
- Monitor the `analytics_worker` queue
- See message rates
- Inspect dead-lettered messages

## Analytics Flow

1. User submits a form → saved in `FormSubmission`
2. Backend publishes event to RabbitMQ exchange `form_submissions` (fanout)
3. Python worker consumes the event
4. Worker runs: field stats → NLP → risk scoring → anomaly detection → categorization
5. Results upserted into `FormStat` and `FormAnalysis`
6. Frontend `/dashboard/forms/:id` shows live results (refresh button)

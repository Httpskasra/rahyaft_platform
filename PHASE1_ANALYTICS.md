# Phase 1 — Forms & Repairs Analytics

## What was implemented

### Forms
- New `GET /forms/analytics/overview` endpoint for the forms management overview.
- New `GET /forms/:id/analytics` endpoint for per-form analytics.
- Range filtering: `7d`, `30d`, `90d` (with optional `from` / `to` backend support).
- KPIs calculated directly from PostgreSQL data:
  - submissions
  - previous-period change
  - approved / rejected / pending
  - approval / rejection / pending rates
  - average processing time
  - median processing time on per-form analytics
  - submissions without an approval workflow
- Daily submission trend.
- Status distribution.
- New global Forms Analytics page: `/dashboard/forms/analytics`.
- Rebuilt per-form Analytics page: `/dashboard/forms/manage/:id/analytics`.
- Added an “تحلیل کلی” shortcut to the forms management page.

### Repairs
- Replaced mock Reports data with real backend analytics.
- New `GET /repairs/analytics/overview` endpoint.
- The endpoint respects the same SELF permission scope as the repairs list.
- KPIs:
  - total cases in the selected period
  - change versus previous period
  - open cases
  - completed cases
  - canceled / rejected
  - MTTR
  - Lead Time
  - Time To Start
- Daily created/completed trend.
- Repair status distribution.
- Repair type distribution (IN_HOUSE / ON_SITE).
- Reports page now reads real API data.
- Repair status changes now populate `startedAt` when entering `IN_REPAIR` and `completedAt` when reaching a completed terminal state.
- Analytics falls back to `RepairStatusLog` for older records whose timestamp fields are empty.

## Database migration
No Prisma schema change was required in Phase 1, so there is no migration to run.

## Test checklist

### Backend
1. Start Postgres/Redis/RabbitMQ and backend as you normally do.
2. Run Prisma generate if your local generated client is stale:
   `npx prisma generate`
3. Start backend:
   `npm run start:dev`
4. Log in with a user that has `read:forms` and `read:repairs` permissions.
5. Check:
   - `GET /forms/analytics/overview?range=30d`
   - `GET /forms/<FORM_UUID>/analytics?range=30d`
   - `GET /repairs/analytics/overview?range=30d`

### Forms UI
1. Open `/dashboard/forms/manage`.
2. Click `تحلیل کلی`.
3. Switch between 7 / 30 / 90 days and verify KPI/trend updates.
4. Open a form and choose its `تحلیل` tab.
5. Submit a new response and verify submission count changes.
6. Approve/reject a submission and verify status KPIs and average decision time.
7. Test a form without an approval policy; it should appear under `بدون گردش تأیید`, not as approved/rejected.

### Repairs UI
1. Open `/dashboard/repairs/reports`.
2. Verify there is no mock SLA data anymore.
3. Create repair cases of both IN_HOUSE and ON_SITE types.
4. Move one case to `IN_REPAIR`; verify `startedAt` is populated.
5. Complete the allowed status flow through `DELIVERED`, `CLOSED`, or `NO_REPAIR_REQUIRED`; verify `completedAt` is populated.
6. Verify MTTR / Lead Time / Time To Start become available once enough cases have timestamps.
7. Switch 7 / 30 / 90 day filters.
8. Test with a SELF-scoped technician and confirm analytics only uses cases assigned to that technician.

## Notes
- Phase 1 intentionally does not use LLM/AI analytics.
- SLA, bottleneck, per-step approval analysis, repair aging, technician performance, and field-level dynamic form analytics are reserved for later phases.
- Dependency installation was unavailable in the artifact environment, so a full Next/Nest build could not be executed here. The modified TypeScript files were syntax-checked with the available global TypeScript compiler; local production build should be run after `npm ci` in both `backend` and `frontend`.

# Production V2 — Flow → Product Runs → Checklist → QC → Analytics

## What changed

### 1. Reusable production flows
A `ProductionFlow` is now explicitly treated as a reusable template. You create it once and can create unlimited independent `ProductionRun` records from it.

Each flow supports:
- ordered steps
- form per step
- assignee, supervisor and approver per step
- estimated duration
- checklist template per step
- optional final QC
- default QC assignee

### 2. Product-level production runs
Each run is a traceable product/order and now stores:
- `productName`
- `productCode`
- unique `serialNumber`
- `batchNumber`
- `quantity`
- `dueDate`
- production reference number
- current step / overall status
- final QC status

Old runs are preserved by the migration: their `title` is copied into `productName`.

### 3. Step checklist
Checklist templates are defined on Flow steps. When a Run starts, each checklist is copied as a snapshot into the Run step.

This means later template changes never rewrite old production history.

Required checklist items must be completed before the operator can submit that step's form.

### 4. Final QC and rework
A Flow may require final QC.

When all normal steps complete:
1. The product goes to `PENDING` QC instead of becoming completed.
2. The assigned QC person can PASS or FAIL it.
3. PASS => Run becomes `COMPLETED`.
4. FAIL => last production step becomes `NEEDS_REVISION` and the run returns to production.
5. After rework, it goes back to `PENDING` QC.

QC notes, reviewer and timestamp are stored.

### 5. Search and tracking UI
The Production page now supports search/filter by:
- product name
- product code
- serial number
- batch number
- production reference number
- flow name
- run status
- QC status
- Flow

Every product card shows current progress and QC status.

### 6. Production analytics + AI
New page:

`/dashboard/production/reports`

Includes:
- total / active / completed / overdue production
- completion rate
- average cycle time
- QC pass rate and QC failures
- checklist completion rate
- production trend
- status distribution
- QC distribution
- Flow performance
- operator workload
- production bottlenecks by step duration
- recent products
- AI summary
- free-form AI questions grounded only in aggregate Production metrics
- report search/filter context

New endpoints:
- `GET /production/analytics/overview`
- `POST /production/analytics/ai-summary`
- `POST /production/analytics/ask`

### 7. Database migration
Migration added:

`backend/prisma/migrations/20261017000000_production_tracking_qc/migration.sql`

It adds the new production columns and QC enum while preserving old runs.

## Test with compose.test.yml

From the project root:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml down
docker compose --env-file .env.test -f docker-compose.test.yml build --no-cache backend frontend migrate
docker compose --env-file .env.test -f docker-compose.test.yml up -d
```

If your environment file has another name, use the same env file you were already using with this project.

Check migration/backend/frontend:

```bash
docker compose --env-file .env.test -f docker-compose.test.yml logs migrate
docker compose --env-file .env.test -f docker-compose.test.yml logs backend --tail=200
docker compose --env-file .env.test -f docker-compose.test.yml logs frontend --tail=200
```

## Functional smoke test

1. Login with an account that has `production-flows` create/read and `production-runs` create/read/update.
2. Open `/dashboard/production`.
3. Create a Flow with at least 2 steps.
4. Add 2–3 checklist items to one step.
5. Enable final QC and choose a QC user.
6. Create Product A with a serial number.
7. Create Product B from the **same Flow** with another serial number. This verifies Flow reuse.
8. Search Product A by serial number in the Runs tab.
9. Open Product A.
10. Try submitting a step before checking required checklist items; backend should reject it.
11. Complete checklist and submit form.
12. Complete supervisor/approver actions if configured.
13. Complete all steps.
14. Verify the product shows `PENDING` QC instead of completed.
15. Login as QC assignee and FAIL QC with a note.
16. Verify the last step reopens as `NEEDS_REVISION`.
17. Rework and finish the last step again.
18. PASS QC.
19. Verify run becomes `COMPLETED`.
20. Open `/dashboard/production/reports` and verify KPIs/charts/search.
21. Run AI summary and ask a Production-specific question, e.g. `کدام مرحله بیشترین زمان را می‌گیرد؟`.

## Important build note
The backend Dockerfile already runs `npx prisma generate` before the Nest build. This is required because the checked-in generated Prisma client reflects the old schema until generation runs.

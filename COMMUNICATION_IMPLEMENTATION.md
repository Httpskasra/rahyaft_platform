# Communication / WorkHub roadmap

This file keeps the agreed implementation phases and their acceptance state.

## Phase 1 — Core (implemented)

- Thread, message, participant and assignment data models
- Status, priority, due date and activity timeline
- Personal inbox views and unread tracking through `ThreadParticipant.lastReadAt`
- Scope-aware authorization plus `communication` RBAC permissions
- NestJS APIs and the `/dashboard/communications` user interface

## Phase 1.5 — Core Hardening (implemented; awaiting user acceptance)

- Scope-aware Thread access (`SELF`, `TEAM`, `DEPARTMENT`, `DEPARTMENT_SUBTREE`, `RELATED_DEPARTMENTS`, `ORG_WIDE`)
- Durable assignment history
- Cursor pagination for messages
- Activity Timeline UI extraction
- Access/scope tests and edge-case hardening

See `COMMUNICATION_PHASE_1_5.md` for acceptance tests.

## Phase 2 — UX + real-time (pending)

- WebSocket, mention, notification, attachment, reply, search, filters and optimistic UI

## Phase 3 — Integration (pending)

- Link threads to customers, repairs, forms, sales opportunities, users and departments

## Phase 4 — AI (pending)

- Summarization, action items, urgency, similar threads and smart search
- RabbitMQ, a separate AI worker and pgvector

## Phase 5 — Analytics (pending)

- Response and resolution time, open/overdue threads, department workload, common topics and AI-detected risks

No later phase starts until the current phase is accepted.

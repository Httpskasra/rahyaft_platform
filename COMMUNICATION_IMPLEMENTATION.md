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

## Phase 2 — UX + real-time (implemented)

- Phase 2A: WebSocket realtime, reply, optimistic UI, retry/idempotency
- Phase 2B: mention, notification center, attachment and advanced filters

## Phase 3 — Integration (implemented; awaiting user acceptance)

- Generic `ThreadEntityLink` integration for customers, repairs, forms, form submissions, sales opportunities, users and departments
- Contextual creation and related-conversation panels on business pages
- Parent-context auto links: Repair → Customer, Sales Opportunity → Customer, Form Submission → Form
- Entity-level permission checks for protected modules

See `COMMUNICATION_PHASE_3.md` for acceptance tests.

## Phase 4 — AI (pending)

- Summarization, action items, urgency, similar threads and smart search
- RabbitMQ, a separate AI worker and pgvector

## Phase 5 — Analytics (pending)

- Response and resolution time, open/overdue threads, department workload, common topics and AI-detected risks

No later phase starts until the current phase is accepted.

---

## Phase 2A — Realtime Core

Phase 2A adds a standard WebSocket channel, realtime message/thread/inbox synchronization, optimistic sending with safe retry/idempotency, and persistent reply-to-message support. See `COMMUNICATION_PHASE_2A.md` for exact test scenarios.

## Phase 2B — completed

- Persistent mentions (`ThreadMention`)
- Communication notification center (`CommunicationNotification`)
- Attachments with persisted metadata and production Docker volume (`ThreadAttachment`)
- Realtime notification/attachment events
- Advanced filters: type, creator, assignee, participant, attachment presence
- Mention target membership validation

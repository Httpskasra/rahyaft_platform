# Forms Phase 3 — Approval Inbox

## Implemented

- Dedicated approval inbox at `/dashboard/approvals`
- Pending requests are resolved from the current user's role(s) and the workflow's current step
- Personal approval/rejection history
- Search by form, form code, submitter, phone, or submission id
- Approval statistics cards
- Submission detail drawer
- Full approval timeline with role and approver information
- Approval signature snapshots shown in timeline
- Submitted form values displayed using the form schema labels
- Approve / reject actions directly from the inbox
- Rejection reason is mandatory on both frontend and backend
- Signature presence is checked before decision buttons are enabled
- Link to profile when the user has not defined a signature

## Backend endpoints

- `GET /api/v1/approvals/inbox`
- `GET /api/v1/approvals/inbox/:submissionId`
- Existing `POST /api/v1/approvals/submissions/:submissionId/approve` is reused for decisions

## Test flow

1. Create a form and define an approval policy with at least one role.
2. Submit the form using a user account.
3. Log in as a user who has the role assigned to the current approval step.
4. Open `/dashboard/approvals`.
5. Confirm the request appears in `نیازمند بررسی`.
6. Open the request and verify form values and the approval timeline.
7. If signature is missing, define it in `/dashboard/profile`.
8. Approve the request and verify it moves to history; for a multi-step workflow, verify the next role receives it.
9. Submit another request and reject it. Verify rejection without a reason is blocked.
10. Verify the stored signature appears on the timeline after the decision.

## Build note

A backend dependency installation was attempted in the artifact environment, but it timed out before Nest CLI was fully installed, so a complete build could not be executed there. Partial `node_modules` created during that attempt were removed from the delivered project.

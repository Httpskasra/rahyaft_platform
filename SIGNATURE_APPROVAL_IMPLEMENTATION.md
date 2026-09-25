# Profile-drawn Signature + Approval PDF

## Final behavior

### 1. User creation
Creating a user no longer asks for, uploads, or stores a signature.

`POST /api/v1/users` remains the normal user-creation endpoint.

### 2. Signature is self-service in Profile
Each authenticated user opens `/dashboard/profile` and uses the **Digital Signature** canvas.

The signature can be drawn with:
- Mouse
- Touch
- Stylus / pen

The UI provides:
- Current saved signature preview
- Signature drawing canvas
- Clear canvas
- Save / replace signature
- Success/error feedback

No image/file upload UI is used.

### 3. Self-only API
The profile uses these authenticated endpoints:

- `GET /api/v1/users/me/signature`
- `POST /api/v1/users/me/signature`

POST body:

```json
{
  "signatureDataUrl": "data:image/png;base64,..."
}
```

The backend validates the PNG data, limits its size, stores it under:

`uploads/signatures/users`

A user can update only their own profile signature through these routes; no `update:users` admin permission is required for this self-service operation.

### 4. Approval behavior
The existing approval rule is preserved: a user without a saved signature cannot approve/reject a form.

When an approval/rejection happens, the system creates a snapshot of the user's current signature in:

`uploads/signatures/approvals`

Therefore changing the profile signature later does **not** modify historical approvals or old PDFs.

### 5. PDF / approval history
Approval history and generated PDFs continue to use the signature snapshot stored on each `ApprovalAction`.

### 6. Database
No new migration is required beyond the previous signature migration. These nullable fields are still used:

User:
- `signatureStorageKey`
- `signatureMimeType`

ApprovalAction:
- `signatureStorageKey`
- `signatureMimeType`

## Test flow

1. Create a new user from the Users page. Confirm there is no signature field.
2. Login as the new user.
3. Open `/dashboard/profile`.
4. Confirm status says signature is not registered.
5. Try approving a form before registering a signature; backend should reject it.
6. Draw a signature in the profile canvas and click Save.
7. Refresh the profile; the current signature preview should still be visible.
8. Approve a form.
9. Open approval history / export PDF and verify the signature appears.
10. Return to Profile and draw a different signature, then save it.
11. Verify the old approval/PDF still shows the old snapshot while new approvals use the new signature.

## Production persistence
Keep the signature upload volume persistent, for example:

```yaml
signature_uploads:/app/uploads/signatures
```

## Controlled-form PDF layout (reference paper forms)

PDF export has been redesigned to follow the scanned organizational forms supplied as visual references.

### Layout
- A4 portrait with a strong outer document frame.
- Repeated controlled-document header on every page.
- Header includes:
  - Rahyaft Teb text mark
  - form title
  - form code (`customId` when available)
  - submission/document number
  - form revision
  - Jalali date
  - page X of Y
- Submitter, date and time are shown in a compact metadata row.
- Form description is rendered as a boxed "purpose/description" section.
- Normal fields are rendered two-per-row in dense bordered tables.
- Textareas use full-width ruled sections.
- Checkbox/radio fields are printed as paper-style selectable boxes/circles.
- Table fields include a numbered row column and controlled borders.
- Approval/signature history is printed as a formal signature table.
- Each approver keeps the signature snapshot that existed at approval time.
- Footer includes the immutable submission id and electronic-document note.

### Pagination
The exporter now renders one A4 DOM page at a time instead of taking one very tall screenshot and slicing it. This prevents form rows, tables and approval signatures from being cut across page boundaries. The header is repeated for every generated page.

# Add Box via Scanner

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Allow inventory managers and admins to add new boxes directly from the Scanner page — either by scanning an unrecognized QR code (ad-hoc) or by entering details manually. The new box is immediately set to RECEIVED state as part of the same action.

## Scope

- Only active in **Check In** scan mode
- Only visible to users with **admin** or **inventory_management** role in the selected project
- No changes to other scan modes (activate, return, check_out)

## UI Flow

### Unknown scan prompt

When a Check In scan returns a "box not found" error and the user is authorized:

1. Replace the red error message with an inline "Add New Box" card
2. Card contains:
   - QR code field — pre-filled with the scanned value, editable
   - Label field — optional, free text
   - Condition — read-only summary of the value already set above the scanner
   - Notes — read-only summary of the value already set above the scanner
   - "Add & Check In" button
   - "Cancel" button — dismisses the card, returns to normal state
3. On submit: create box → check in → show green success message, reset form

### Manual entry button

- A "Add Box Manually" button is always visible in Check In mode for authorized users, placed below the scanner toggle button
- Tapping opens the same form as above, with an empty QR code field
- User types the QR code string manually

## Role Check

On project selection change, fetch the user's role via `GET /api/projects/{projectId}`. Store in `userRole` state. Show add-box UI only when `['admin', 'inventory_management'].includes(userRole)`.

Same pattern already used in `src/components/Dashboard.tsx`.

## Data Flow

Two sequential API calls on submit:

1. **Create box**  
   `POST /api/projects/{projectId}/boxes`  
   Body: `{ qrCode, label }`  
   
2. **Check in**  
   `POST /api/boxes/scan`  
   Body: `{ projectId, qrCode, action: 'check_in', condition, notes }`

## Error Handling

| Failure point | Behaviour |
|---|---|
| Creation fails (e.g. duplicate QR in project) | Show error inside the form, keep form open |
| Creation succeeds, check-in fails | Show warning: "Box created but check-in failed — scan it again to check in." Box exists without state history and recovers on next normal Check In scan. |

## Files to Change

- `src/pages/scanner.tsx` — all UI and logic changes
- No API changes required; existing endpoints cover both operations

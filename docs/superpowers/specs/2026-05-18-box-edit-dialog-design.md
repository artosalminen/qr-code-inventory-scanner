# Box Edit Dialog

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Allow admins and inventory managers to edit a box's state, condition, and notes directly from the dashboard. Each save creates a new immutable history entry (`changeType: manual_override`).

## Roles

Admin and inventory_management only. The edit icon is hidden from installation and read_only users (enforced both client-side and in the existing server-side role check on the state-override endpoint).

## UI Flow

1. Click any box card → bottom sheet opens (unchanged — shows current state, history)
2. Edit icon (✏️) appears in the bottom sheet header next to the close button, visible to authorized users only
3. Click edit icon → modal opens over a dark backdrop
4. Modal fields:
   - **State** — dropdown pre-filled with the box's current state
   - **Condition** — OK / Damaged toggle pre-filled with the latest condition from state history (defaults to "ok" if no history)
   - **Notes** — empty textarea; optional free-text for this edit
5. Click **Save** → POST to state-override API → close modal → refresh history in bottom sheet → show inline success message
6. Click **Cancel** or the backdrop → modal closes, no changes

## API Change

`POST /api/boxes/[id]/state-override`

Current body: `{ newState, reason }` — reason required.  
New body: `{ newState, condition?, notes? }` — all optional except `newState`.

- Remove the "reason required" validation
- Add optional `condition` field, passed to `BoxStateHistory.condition`
- Rename `reason` parameter to `notes` in destructuring (stored in `BoxStateHistory.notes` as before)

The existing role check (`admin` or `inventory_management`) is unchanged.

## Component Changes

`src/components/Dashboard.tsx`:
- Remove the existing inline state override form (the orange "Change State" button + inline select + textarea + confirm button) from the bottom sheet
- Add edit icon button (✏️) to the bottom sheet header — visible only when `userRole` is `admin` or `inventory_management`
- Add modal component inline: dark fixed backdrop + centered card with the fields described above
- New state variables: `editModalOpen`, `editState`, `editCondition`, `editNotes`, `isSaving`, `editError`
- Pre-fill `editCondition` from `history[0]?.condition ?? 'ok'` when modal opens

`src/pages/api/boxes/[id]/state-override.ts`:
- Accept `condition` and `notes` (replacing `reason`) in request body
- Remove required validation on notes/reason
- Pass `condition` to the `BoxStateHistory` create call

## No New Files

All changes are in the two files above.

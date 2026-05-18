# Edit Box Label from Admin Page

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Allow admins and inventory managers to edit a box's label directly from the admin project page box list, using an inline edit pattern consistent with the existing "Change State" expansion.

## UI Flow

Each box row in the boxes list gains a pencil icon (✏️) next to the label/QR display. Visible only to admin and inventory_management roles.

1. Click ✏️ → row expands inline to show a text input pre-filled with the current label (empty if no label set)
2. User edits label
3. **Save** → `PATCH /api/projects/${id}/boxes/${boxId}` with `{ label }` → row collapses, list refreshes
4. **Cancel** → row collapses, no change

Error: if save fails, show an inline error message below the input.

## API

New file: `src/pages/api/projects/[id]/boxes/[boxId].ts`

- `PATCH` handler: requires admin or inventory_management role; updates `box.label`; returns updated box

## Files

| File | Change |
|---|---|
| `src/pages/api/projects/[id]/boxes/[boxId].ts` | New — PATCH to update box label |
| `src/pages/admin/projects/[id].tsx` | Add edit icon, inline label edit form |

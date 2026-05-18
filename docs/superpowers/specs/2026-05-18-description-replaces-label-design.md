# Description Replaces Label in UI

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Replace all Label references in the UI with Description. The `label` DB column stays as an optional backend field but is no longer used in the UI. `description` becomes the human-readable identifier for a box.

## Changes

### Display (read-only)

| Location | Current | New |
|---|---|---|
| Dashboard box cards (secondary line) | `box.label \|\| '-'` | `box.description \|\| '-'` |
| Dashboard bottom sheet title | `selectedBox.label \|\| 'Unlabeled'` | `selectedBox.description \|\| selectedBox.qrCode` |
| Admin project page — boxes list | `box.label` | `box.description` |

Scan history (Recent Scans in scanner) is **not changed** — it shows the scan identifier/note, not the box description.

### Form inputs

| Location | Current field label | New field label | Sends |
|---|---|---|---|
| Admin "Add Box" form | "Label (optional)" | "Description (optional)" | `description` |
| Admin inline edit form | "Edit Label" | "Edit Description" | `description` |
| Scanner "Add Box" form | "Label (optional)" | "Description (optional)" | `description` |

### API

`PATCH /api/projects/[id]/boxes/[boxId]` — update `description` field instead of `label`.

## Not Changed

- `label` column in the database — stays, optional, not displayed
- Scan history (Recent Scans list in scanner)
- Any backend logic that references `label`
- CSV import — `label` column in CSV stays as-is (backend only)

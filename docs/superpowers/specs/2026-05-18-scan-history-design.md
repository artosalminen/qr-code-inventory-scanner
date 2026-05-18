# Scan History on Scanner Page

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Show the last 5 scanned boxes on the Scanner page so operators can see recent activity at a glance.

## Scope

- Client-side session state only — resets on page reload, no API or database changes
- Visible in all scan modes
- Updated by both successful QR scans and successful "Add & Check In" submissions

## Data

A `scanHistory` array in component state, capped at 5 entries, newest first:

```ts
interface ScanHistoryEntry {
  label: string;   // box label, falls back to qrCode if label absent
  qrCode: string;
  newState: BoxState;
  timestamp: Date;
}
```

On each successful scan or add-box: prepend entry, slice to 5.

## UI

A compact card rendered below the main scanner card. Each row shows:
- Box label (or QR code if no label)
- State badge using the existing color scheme: blue = received, yellow = in_use, orange = ready_for_checkout, green = departed
- Time elapsed: "just now", "2 min ago", etc.

Hidden when `scanHistory` is empty (no card shown on first load).

## Files

- `src/pages/scanner.tsx` — only file changed

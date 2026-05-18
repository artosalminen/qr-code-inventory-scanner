# Scan Confirmation Step

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Move condition and notes entry to after the QR scan, not before. Scanning captures the QR code, closes the scanner, and presents a confirmation card where the user reviews the action, sets condition, and adds notes before committing.

## Flow

1. User selects scan mode
2. Opens scanner, scans a QR code
3. Scanner closes; a **confirmation card** appears showing:
   - Scanned QR code (read-only)
   - Scan action label (e.g. "Check In")
   - Condition toggles — OK / Damaged (shown for `check_in` and `check_out` modes only)
   - Notes textarea (optional)
   - **Confirm** button → sends scan API call
   - **Re-scan** button → discards, reopens scanner
4. On success: card dismisses, success message shown, scanner auto-reopens (existing behaviour)
5. On error: card stays open with inline error message

## State Changes

- Remove: condition and notes inputs from above the scanner
- Add: `pendingScanQr: string | null` — null = no pending scan, string = QR waiting for confirmation
- Add: `confirmCondition: string` and `confirmNotes: string` — local to the confirmation step, reset after confirm or re-scan

`handleScan(qrCode)` no longer calls the API directly. It sets `pendingScanQr = qrCode` and closes the scanner.

A new `handleConfirmScan()` function reads `pendingScanQr`, `confirmCondition`, `confirmNotes`, calls `POST /api/boxes/scan`, then resets confirmation state.

## Files

- `src/pages/scanner.tsx` — only file changed. No API changes.

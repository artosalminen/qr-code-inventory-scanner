# Scanner Pre-Validation Design

**Date:** 2026-05-19
**Status:** Approved

## Problem

The scanner confirmation form (condition, notes, photos) is shown immediately after a QR scan, before any server validation. If the action is invalid (wrong state, wrong role, box not found), the user discovers this only after filling in the form and pressing Confirm — wasted effort.

## Goal

After a scan, immediately show the box's current state and whether the intended action is valid. Show the confirmation form only if the action is valid. Show a clear, human-readable reason if it is not.

## Design

### New API Endpoint: `GET /api/boxes/preview`

Read-only endpoint. No writes, no side effects.

**Query parameters:**
- `qrCode` — scanned QR code string
- `projectId` — current project ID
- `action` — intended scan action (`check_in`, `activate`, `return`, `check_out`)

**Response shape:**

```typescript
// Box found, transition valid
{ box: { id: string; label: string; qrCode: string; currentState: string }, valid: true }

// Box found, transition invalid
{ box: { id: string; label: string; qrCode: string; currentState: string }, valid: false, reason: string }

// Box not found
{ box: null, valid: false, reason: "Box not found in this project" }
```

**Server logic (all read-only):**
1. Validate session → 401 if missing
2. Validate user has a role in the project → 403 if not
3. Find box by `qrCode + projectId`
4. Get current state from latest `boxStateHistory` entry
5. Check role permits the action (same logic as `scan.ts`)
6. Check state machine allows the transition
7. Return result

**Human-readable reasons:**
- `"Box not found in this project"`
- `"Your role cannot perform this action"`
- `"Box is in state [X] — cannot [action]"`
- `"Box is already in use by [username]"` (activate on in_use box)

### UI Flow in `scanner.tsx`

```
[ QR code scanned ]
       ↓
  offline?
  ├── yes → set preview = { status: 'offline' }
  │         show form as today (no change)
  └── no  → set preview = { status: 'loading' }
             fetch GET /api/boxes/preview
             ↓
        ┌─────────────────────────────┐
        │  Box A1                      │
        │  Current state: IN USE       │
        │                              │
        │  ✓ Ready to return           │  green — valid
        │  OR                          │
        │  ✗ Box is already in use     │  red — invalid reason
        └─────────────────────────────┘
             ↓
        valid?
        ├── yes → show form below card (condition / notes / photos / Confirm)
        └── no  → show Rescan button only (form hidden)
```

### New State Variable

```typescript
type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; box: { id: string; label: string; qrCode: string; currentState: string } }
  | { status: 'invalid'; box: { id: string; label: string; qrCode: string; currentState: string } | null; reason: string }
  | { status: 'offline' }
```

**Lifecycle:**
- `handleScan()` fires → sets `pendingScanQr` + sets preview to `loading` (or `offline`)
- `useEffect` on `pendingScanQr` calls the endpoint → sets preview to `valid` or `invalid`
- Rescan / cancel → resets `pendingScanQr` and preview to `idle`
- Successful confirm → resets both to `idle`

**Rendering rules:**
| Preview status | Status card | Form visible |
|---|---|---|
| `loading` | Spinner: "Checking box status…" | No |
| `valid` | Green card: box name, current state, action | Yes |
| `invalid` | Red card: box name, current state, reason | No (Rescan only) |
| `offline` | None | Yes (as today) |
| `idle` | None | No |

## Out of Scope

- Offline pre-validation (not feasible without connectivity)
- Caching box state on client (stale data risk outweighs latency savings)
- Changes to the confirm submit flow (unchanged)

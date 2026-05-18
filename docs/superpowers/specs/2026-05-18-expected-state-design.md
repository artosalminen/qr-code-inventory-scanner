# Expected Box State

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Add an `expected` state for boxes that have been registered in the system by an admin but have not yet been physically received. Check-in moves a box from `expected` to `received`.

## State Machine Changes

New transition:
- `expected` → `received` via `check_in` — roles: admin, inventory_management

Kept:
- `received` → `received` via `check_in` — re-checking condition/notes on an already-received box

No other actions are valid from `expected` state — a box must be checked in before it can be activated, returned, or checked out.

Updated full workflow:
```
expected → received (check_in)
received → in_use (activate)
received → departed (check_out, direct)
in_use → ready_for_checkout (return)
ready_for_checkout → departed (check_out)
```

## Files

| File | Change |
|---|---|
| `src/types/index.ts` | Add `'expected'` to `BoxState` |
| `src/lib/state-machine.ts` | Add `expected → received` transition |
| `src/pages/api/projects/[id]/boxes.ts` | Initial state `expected` instead of `received` |
| `src/components/Dashboard.tsx` | Purple colour for expected, new stats card, new filter button |
| `src/pages/scanner.tsx` | Purple badge for expected in scan history |

## UI Details

- Dashboard colour: `bg-purple-900 border-purple-500 hover:bg-purple-800` (box card)
- Stats badge: `bg-purple-900/50 text-purple-300 border border-purple-700` (scan history)
- Stats card: border-purple-500, count in purple-400
- Filter button: same pill style as other state filters
- Label: "Expected"

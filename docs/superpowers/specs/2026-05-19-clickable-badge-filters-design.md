# Clickable Badge Filters Design

**Date:** 2026-05-19  
**Status:** Approved  
**File:** `src/components/Dashboard.tsx`

## Summary

Replace the separate row of filter buttons with clickable counter badges. Each state badge (Expected, Received, In Use, Ready for Checkout, Departed) doubles as a multi-select filter toggle. The Total badge remains informational only. A "Clear filters" chip appears when any filter is active.

## State & Filtering Logic

Replace `filterState: BoxState | 'all'` with `activeFilters: Set<BoxState>` (React state, initialized empty).

```typescript
const [activeFilters, setActiveFilters] = useState<Set<BoxState>>(new Set());

const filteredBoxes =
  activeFilters.size === 0
    ? boxes
    : boxes.filter((b) => activeFilters.has(b.currentState));
```

Toggle handler:
```typescript
function toggleFilter(state: BoxState) {
  setActiveFilters((prev) => {
    const next = new Set(prev);
    next.has(state) ? next.delete(state) : next.add(state);
    return next;
  });
}
```

Clear handler:
```typescript
function clearFilters() {
  setActiveFilters(new Set());
}
```

## Badge Appearance

Each of the 5 state badges (not Total):

- `cursor-pointer` + `onClick={() => toggleFilter(state)}`
- Small `FunnelIcon` (Heroicons, ~12px) in the top-right corner of the badge
  - Filter OFF: `text-slate-500 opacity-40` (muted)
  - Filter ON: `text-slate-200` (visible)
- Border brightens when active: `border-opacity-100` (on) vs `border-opacity-30` (off)
- `hover:` style on inactive badges to hint clickability

Total badge: no icon, no click handler, `cursor-default`, unchanged visually.

## "Clear Filters" Button

Rendered where the old filter row was:

- Only visible when `activeFilters.size > 0`
- Small, muted style — ghost chip or underlined text with `×` icon
- `onClick` → `clearFilters()`
- Left-aligned, single-element row

## Removed

- The 6-button filter row (`All`, `Expected`, `Received`, `In Use`, `Ready for Checkout`, `Departed`) is deleted entirely.
- `filterState: BoxState | 'all'` state variable is removed.

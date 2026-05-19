# Project Selection Persistence Design

**Date:** 2026-05-19  
**Status:** Approved

## Problem

`selectedProjectId` is local `useState` in both `dashboard.tsx` and `scanner.tsx`. On every navigation or page reload it resets to the first project in the list, losing the user's context.

## Goal

Remember the last selected project in localStorage. On load, auto-select it. If the stored project is archived or no longer accessible, fall back to the first available active project.

## Approach: Custom hook `usePersistedProject`

A single hook in `src/lib/use-persisted-project.ts` that is a drop-in replacement for the `useState` calls in both pages.

### Hook signature

```typescript
function usePersistedProject(projects: Project[]): [string, (id: string) => void]
```

### Behaviour

- **On mount** — reads `localStorage.getItem('selectedProjectId')`. Checks if that ID exists in the `projects` array. If valid, uses it. Otherwise falls back to `projects[0]?.id ?? ''`.
- **On change** — writes to `localStorage.setItem('selectedProjectId', id)` whenever the user selects a different project.
- **SSR-safe** — guards with `typeof window !== 'undefined'` (same pattern as `src/lib/locale.ts`).
- **localStorage key** — `'selectedProjectId'`, shared across dashboard and scanner so switching on one page persists to the other.

### Re-evaluation on projects load

The hook uses `useEffect` with `projects` as a dependency but only applies the localStorage-based selection **once** — when the list first transitions from empty to populated. After that initial selection, changes to the `projects` list (e.g. a background refetch) do not reset the user's current selection. Initial render returns `''` (same as today).

## Integration

**`src/pages/dashboard.tsx`**

Replace:
```typescript
const [selectedProjectId, setSelectedProjectId] = useState<string>('');
```
With:
```typescript
const [selectedProjectId, setSelectedProjectId] = usePersistedProject(projects);
```

Remove the existing `setSelectedProjectId(data[0].id)` fallback inside `fetchProjects`.

**`src/pages/scanner.tsx`** — identical swap and removal.

All existing `<select onChange>` handlers, `<Dashboard projectId={selectedProjectId}>` props, and socket room join/leave logic continue to work unchanged.

## Edge Cases

| Case | Behaviour |
|------|-----------|
| Stored ID is archived | Not in the active projects list → fall back to `projects[0]` |
| Stored ID was deleted | Same as archived |
| No projects available | Returns `''` — same as today |
| localStorage empty (first visit) | Falls back to `projects[0]` — same as today |
| Projects not yet loaded | Returns `''` until fetch completes, then re-evaluates |

## What does NOT change

- API endpoints — no new endpoints, no schema changes
- `Project` type — no modifications
- Socket room logic — still driven by `selectedProjectId`, works unchanged
- Admin pages — use URL-based routing (`/admin/projects/[id]`), not affected

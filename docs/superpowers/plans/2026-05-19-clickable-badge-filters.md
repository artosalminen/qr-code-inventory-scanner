# Clickable Badge Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate filter button row on the dashboard with clickable state counter badges that support multi-select filtering, plus a "Clear filters" chip.

**Architecture:** All changes are confined to `src/components/Dashboard.tsx`. The single `filterState: BoxState | 'all'` state variable is replaced with a `Set<BoxState>` called `activeFilters`. The 6-button filter row is removed. Each of the 5 state badges (not Total) gains a click handler, a hover style, an active-border style, and an inline SVG funnel icon (top-right corner, muted when off, bright when on). A "Clear filters" chip replaces the button row and is only visible when the set is non-empty.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Next.js (pages router)

---

### Task 1: Replace filter state and filtering logic

**Files:**
- Modify: `src/components/Dashboard.tsx:35,144-145`

- [ ] **Step 1: Replace the `filterState` state declaration (line 35)**

Find:
```tsx
const [filterState, setFilterState] = useState<BoxState | 'all'>('all');
```

Replace with:
```tsx
const [activeFilters, setActiveFilters] = useState<Set<BoxState>>(new Set());
```

- [ ] **Step 2: Add toggle and clear helpers — insert after the `setActiveFilters` line (after the useState declaration block, before `useEffect`)**

```tsx
function toggleFilter(state: BoxState) {
  setActiveFilters((prev) => {
    const next = new Set(prev);
    next.has(state) ? next.delete(state) : next.add(state);
    return next;
  });
}

function clearFilters() {
  setActiveFilters(new Set());
}
```

- [ ] **Step 3: Replace the `filteredBoxes` computation (lines 144-145)**

Find:
```tsx
const filteredBoxes =
  filterState === 'all' ? boxes : boxes.filter((b) => b.currentState === filterState);
```

Replace with:
```tsx
const filteredBoxes =
  activeFilters.size === 0
    ? boxes
    : boxes.filter((b) => activeFilters.has(b.currentState as BoxState));
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors output.

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "refactor: replace filterState with activeFilters Set"
```

---

### Task 2: Make state badges clickable with funnel icon

**Files:**
- Modify: `src/components/Dashboard.tsx:152-177`

This task rewrites the Stats Grid section. The Total badge (first card) is unchanged. Each of the 5 state badges gains: `relative` wrapper positioning, `cursor-pointer`, an `onClick` toggle, border-opacity changes based on active state, a hover ring, and an inline SVG funnel icon anchored top-right.

The funnel SVG (12×12px, Heroicons funnel outline path):
```
M3 4.5h14.25M5.25 9h9M7.5 13.5h4.5
```

- [ ] **Step 1: Define the badge config array above the `return` statement (after the `filteredBoxes` computation)**

```tsx
const stateBadges: { state: BoxState; label: string; count: number; borderColor: string; textColor: string }[] = [
  { state: 'expected',           label: tStates('expected'), count: stats.expected,          borderColor: 'border-purple-500', textColor: 'text-purple-400' },
  { state: 'received',           label: tStates('received'), count: stats.received,          borderColor: 'border-blue-500',   textColor: 'text-blue-400'   },
  { state: 'in_use',             label: tStates('in_use'),   count: stats.inUse,             borderColor: 'border-yellow-500', textColor: 'text-yellow-400' },
  { state: 'ready_for_checkout', label: tStates('ready'),    count: stats.readyForCheckout,  borderColor: 'border-orange-500', textColor: 'text-orange-400' },
  { state: 'departed',           label: tStates('departed'), count: stats.departed,          borderColor: 'border-green-500',  textColor: 'text-green-400'  },
];
```

- [ ] **Step 2: Replace the entire Stats Grid `<div>` block (lines 151-177) with the new version**

Find the block starting with:
```tsx
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
```
...and ending with the closing `</div>` at line 177.

Replace the entire block with:
```tsx
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {/* Total — informational only, not filterable */}
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{t('total')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-slate-50 mt-2">{stats.total}</div>
        </div>

        {stateBadges.map(({ state, label, count, borderColor, textColor }) => {
          const isActive = activeFilters.has(state);
          return (
            <button
              key={state}
              type="button"
              onClick={() => toggleFilter(state)}
              className={`relative bg-slate-800 p-4 sm:p-6 rounded-lg border text-left transition
                ${borderColor}
                ${isActive ? 'border-opacity-100 ring-1 ring-current' : 'border-opacity-30 hover:border-opacity-70'}
              `}
            >
              {/* Funnel icon — top-right corner */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`absolute top-2 right-2 w-3 h-3 transition ${
                  isActive ? 'text-slate-200 opacity-100' : 'text-slate-500 opacity-40'
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M5.25 9h9M7.5 13.5h4.5" />
              </svg>

              <div className="text-slate-400 text-xs sm:text-sm">{label}</div>
              <div className={`text-2xl sm:text-4xl font-bold mt-2 ${textColor}`}>{count}</div>
            </button>
          );
        })}
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: make state counter badges clickable multi-select filters"
```

---

### Task 3: Replace filter buttons row with Clear filters chip

**Files:**
- Modify: `src/components/Dashboard.tsx` — the Filter Buttons section

- [ ] **Step 1: Replace the entire Filter Buttons block**

Find the block:
```tsx
      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'expected', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${
              filterState === state
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            {state === 'all' ? tStates('all') : tStates(state)}
          </button>
        ))}
      </div>
```

Replace with:
```tsx
      {/* Clear filters — only visible when filters are active */}
      {activeFilters.size > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            {tStates('all')}
          </button>
        </div>
      )}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test in the browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Navigate to a project dashboard and verify:
1. Six badges visible (Total + 5 states). Total has no funnel icon.
2. Each state badge has a muted funnel icon (top-right), dim border, no ring.
3. Clicking a badge: border brightens, ring appears, funnel icon turns bright, box grid filters to that state only.
4. Clicking a second badge: both active, grid shows boxes in either state.
5. Clicking an active badge again: deactivates it.
6. With any filter active: "× All" chip appears below badges. Click it → all filters clear, all boxes shown, chip disappears.
7. No separate filter button row anywhere on the page.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: replace filter buttons with Clear filters chip"
```

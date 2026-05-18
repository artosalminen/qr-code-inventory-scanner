# Expected Box State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `expected` state for newly created boxes so admins can register boxes before they physically arrive, and inventory managers check them in on arrival.

**Architecture:** `expected` is a new value in the `BoxState` union type and a new state in the state machine (`expected → received` via `check_in`). Boxes created via the API start in `expected` instead of `received`. Dashboard and scanner get purple colour coding for the new state.

**Tech Stack:** TypeScript, Next.js Pages Router, React, Tailwind CSS, Prisma

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `'expected'` to `BoxState` |
| `src/lib/state-machine.ts` | Add `expected → received` transition |
| `src/pages/api/projects/[id]/boxes.ts` | Change initial state to `'expected'` |
| `src/components/Dashboard.tsx` | Purple colour, expected stats card, expected filter button |
| `src/pages/scanner.tsx` | Purple badge in scan history |

---

### Task 1: Add `expected` to BoxState type and state machine

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/state-machine.ts`

- [ ] **Step 1: Add `'expected'` to the BoxState union in types**

In `src/types/index.ts`, change:
```ts
export type BoxState = 'received' | 'in_use' | 'ready_for_checkout' | 'departed';
```
to:
```ts
export type BoxState = 'expected' | 'received' | 'in_use' | 'ready_for_checkout' | 'departed';
```

- [ ] **Step 2: Add `expected → received` transition to the state machine**

In `src/lib/state-machine.ts`, add the new transition as the first entry:
```ts
const validTransitions: StateTransition[] = [
  { from: 'expected', to: 'received', action: 'check_in', requiredRoles: ['admin', 'inventory_management'] },
  { from: 'received', to: 'in_use', action: 'activate', requiredRoles: ['admin', 'inventory_management', 'installation'] },
  { from: 'in_use', to: 'ready_for_checkout', action: 'return', requiredRoles: ['admin', 'inventory_management', 'installation'] },
  { from: 'ready_for_checkout', to: 'departed', action: 'check_out', requiredRoles: ['admin', 'inventory_management'] },
  { from: 'received', to: 'departed', action: 'check_out', requiredRoles: ['admin', 'inventory_management'] },
  { from: 'received', to: 'received', action: 'check_in', requiredRoles: ['admin', 'inventory_management'] },
];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects"
```
Expected: no errors (Dashboard.tsx and scanner.tsx will show errors — fix those in subsequent tasks)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/state-machine.ts
git commit -m "feat: add expected BoxState and expected→received transition"
```

---

### Task 2: Set initial box state to `expected`

**Files:**
- Modify: `src/pages/api/projects/[id]/boxes.ts`

- [ ] **Step 1: Change the initial BoxStateHistory entry from `received` to `expected`**

Find:
```ts
    await prisma.boxStateHistory.create({
      data: {
        boxId: box.id,
        state: 'received',
        stateSetBy: req.userId,
        changeType: 'state_change',
        condition: condition || null,
        notes: notes || null,
      },
    });
```

Replace with:
```ts
    await prisma.boxStateHistory.create({
      data: {
        boxId: box.id,
        state: 'expected',
        stateSetBy: req.userId,
        changeType: 'state_change',
        condition: null,
        notes: notes || null,
      },
    });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "boxes.ts"
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add "src/pages/api/projects/[id]/boxes.ts"
git commit -m "feat: new boxes start in expected state"
```

---

### Task 3: Update Dashboard — colours, stats, filter

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add `expected` to `stateColors`**

Find:
```ts
const stateColors: Record<BoxState, string> = {
  received: 'bg-blue-900 border-blue-500 hover:bg-blue-800',
  in_use: 'bg-yellow-900 border-yellow-500 hover:bg-yellow-800',
  ready_for_checkout: 'bg-orange-900 border-orange-500 hover:bg-orange-800',
  departed: 'bg-green-900 border-green-500 hover:bg-green-800',
};
```

Replace with:
```ts
const stateColors: Record<BoxState, string> = {
  expected: 'bg-purple-900 border-purple-500 hover:bg-purple-800',
  received: 'bg-blue-900 border-blue-500 hover:bg-blue-800',
  in_use: 'bg-yellow-900 border-yellow-500 hover:bg-yellow-800',
  ready_for_checkout: 'bg-orange-900 border-orange-500 hover:bg-orange-800',
  departed: 'bg-green-900 border-green-500 hover:bg-green-800',
};
```

- [ ] **Step 2: Add `expected` to `stateLabels`**

Find:
```ts
const stateLabels: Record<BoxState, string> = {
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready for Checkout',
  departed: 'Departed',
};
```

Replace with:
```ts
const stateLabels: Record<BoxState, string> = {
  expected: 'Expected',
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready for Checkout',
  departed: 'Departed',
};
```

- [ ] **Step 3: Add `expected` to the stats calculation**

Find:
```ts
  const stats = {
    total: boxes.length,
    received: boxes.filter((b) => b.currentState === 'received').length,
    inUse: boxes.filter((b) => b.currentState === 'in_use').length,
    readyForCheckout: boxes.filter((b) => b.currentState === 'ready_for_checkout').length,
    departed: boxes.filter((b) => b.currentState === 'departed').length,
  };
```

Replace with:
```ts
  const stats = {
    total: boxes.length,
    expected: boxes.filter((b) => b.currentState === 'expected').length,
    received: boxes.filter((b) => b.currentState === 'received').length,
    inUse: boxes.filter((b) => b.currentState === 'in_use').length,
    readyForCheckout: boxes.filter((b) => b.currentState === 'ready_for_checkout').length,
    departed: boxes.filter((b) => b.currentState === 'departed').length,
  };
```

- [ ] **Step 4: Add expected stats card to the stats grid**

Find:
```tsx
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Total</div>
          <div className="text-2xl sm:text-4xl font-bold text-slate-50 mt-2">{stats.total}</div>
        </div>
        <div className="bg-slate-800 border border-blue-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Received</div>
          <div className="text-2xl sm:text-4xl font-bold text-blue-400 mt-2">{stats.received}</div>
        </div>
        <div className="bg-slate-800 border border-yellow-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">In Use</div>
          <div className="text-2xl sm:text-4xl font-bold text-yellow-400 mt-2">{stats.inUse}</div>
        </div>
        <div className="bg-slate-800 border border-green-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Departed</div>
          <div className="text-2xl sm:text-4xl font-bold text-green-400 mt-2">{stats.departed}</div>
        </div>
      </div>
```

Replace with:
```tsx
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Total</div>
          <div className="text-2xl sm:text-4xl font-bold text-slate-50 mt-2">{stats.total}</div>
        </div>
        <div className="bg-slate-800 border border-purple-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Expected</div>
          <div className="text-2xl sm:text-4xl font-bold text-purple-400 mt-2">{stats.expected}</div>
        </div>
        <div className="bg-slate-800 border border-blue-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Received</div>
          <div className="text-2xl sm:text-4xl font-bold text-blue-400 mt-2">{stats.received}</div>
        </div>
        <div className="bg-slate-800 border border-yellow-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">In Use</div>
          <div className="text-2xl sm:text-4xl font-bold text-yellow-400 mt-2">{stats.inUse}</div>
        </div>
        <div className="bg-slate-800 border border-green-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Departed</div>
          <div className="text-2xl sm:text-4xl font-bold text-green-400 mt-2">{stats.departed}</div>
        </div>
      </div>
```

- [ ] **Step 5: Add `expected` to the filter buttons**

Find:
```tsx
        {(['all', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
```

Replace with:
```tsx
        {(['all', 'expected', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "Dashboard"
```
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: add expected state to dashboard — colour, stats, filter"
```

---

### Task 4: Update scanner scan history badge

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add `expected` to `stateBadgeColors`**

Find:
```ts
const stateBadgeColors: Record<BoxState, string> = {
  received: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  in_use: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  ready_for_checkout: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  departed: 'bg-green-900/50 text-green-300 border border-green-700',
};
```

Replace with:
```ts
const stateBadgeColors: Record<BoxState, string> = {
  expected: 'bg-purple-900/50 text-purple-300 border border-purple-700',
  received: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  in_use: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  ready_for_checkout: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  departed: 'bg-green-900/50 text-green-300 border border-green-700',
};
```

- [ ] **Step 2: Add `expected` to `stateLabels` in scanner**

Find:
```ts
const stateLabels: Record<BoxState, string> = {
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready',
  departed: 'Departed',
};
```

Replace with:
```ts
const stateLabels: Record<BoxState, string> = {
  expected: 'Expected',
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready',
  departed: 'Departed',
};
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects"
```
Expected: no output

- [ ] **Step 4: Manual smoke test**

1. Go to Admin → create a new project → add a box manually
2. Go to Dashboard → box card should appear purple with label "Expected"
3. Stats grid shows "Expected" count in purple
4. Filter buttons include "Expected"
5. Go to Scanner → select Check In → scan the box QR → confirm → box moves to Received (blue)
6. Scan history badge shows "Expected" in purple if a box was checked in from expected state

- [ ] **Step 5: Commit and push**

```bash
git add src/pages/scanner.tsx docs/superpowers/plans/2026-05-18-expected-state.md
git commit -m "feat: add expected state badge to scanner history"
git push origin main
```

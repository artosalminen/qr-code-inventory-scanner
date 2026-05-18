# Box Edit Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins and inventory managers edit a box's state, condition, and notes from the dashboard via an edit icon in the bottom sheet that opens a modal dialog.

**Architecture:** Two file changes — extend the state-override API to accept `condition` and `notes`, then rework Dashboard.tsx to replace the inline override form with an edit icon + modal. Each save creates a new `manual_override` history entry.

**Tech Stack:** Next.js API Routes, React hooks, Tailwind CSS, Axios, Prisma

---

## File Map

| File | Change |
|---|---|
| `src/pages/api/boxes/[id]/state-override.ts` | Accept `condition` + `notes`, remove required-reason check |
| `src/components/Dashboard.tsx` | Remove inline override form, add edit icon + modal |

---

### Task 1: Extend state-override API

**Files:**
- Modify: `src/pages/api/boxes/[id]/state-override.ts`

- [ ] **Step 1: Replace body destructuring and remove required-reason validation**

Change:
```ts
const { newState, reason } = req.body;

if (!newState || !validStates.includes(newState)) {
  return res.status(400).json({ error: 'Invalid new state' });
}

if (!reason || reason.trim() === '') {
  return res.status(400).json({ error: 'Reason is required for manual override' });
}
```
To:
```ts
const { newState, condition, notes } = req.body;

if (!newState || !validStates.includes(newState)) {
  return res.status(400).json({ error: 'Invalid new state' });
}
```

- [ ] **Step 2: Pass condition and notes to BoxStateHistory create**

Change:
```ts
const stateHistory = await prisma.boxStateHistory.create({
  data: {
    boxId: id,
    state: newState,
    stateSetBy: req.userId!,
    changeType: 'manual_override',
    notes: reason,
  },
});
```
To:
```ts
const stateHistory = await prisma.boxStateHistory.create({
  data: {
    boxId: id,
    state: newState,
    stateSetBy: req.userId!,
    changeType: 'manual_override',
    condition: condition || null,
    notes: notes || null,
  },
});
```

- [ ] **Step 3: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "state-override"
```
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add "src/pages/api/boxes/[id]/state-override.ts"
git commit -m "feat: extend state-override API to accept condition and notes"
```

---

### Task 2: Remove inline state override from Dashboard

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Remove the four inline-override state variables**

Find and remove these four state declarations:
```tsx
const [showStateOverride, setShowStateOverride] = useState(false);
const [newState, setNewState] = useState<BoxState>('received');
const [overrideReason, setOverrideReason] = useState('');
const [overridingState, setOverridingState] = useState(false);
```

- [ ] **Step 2: Remove the overrideBoxState function**

Find and remove:
```tsx
async function overrideBoxState() {
  if (!selectedBox || !newState || !overrideReason.trim()) return;
  setOverridingState(true);
  try {
    await axios.post(`/api/boxes/${selectedBox.id}/state-override`, {
      newState,
      reason: overrideReason,
    });
    setShowStateOverride(false);
    setOverrideReason('');
    setNewState('received');
    fetchBoxes();
    if (selectedBox) {
      handleSelectBox(selectedBox);
    }
  } catch (error) {
    console.error('Failed to override state:', error);
  } finally {
    setOverridingState(false);
  }
}
```

- [ ] **Step 3: Remove the inline override UI from the bottom sheet**

Find and remove both blocks inside the bottom sheet `space-y-4` div:

```tsx
{/* State Change Button */}
{userRole && ['admin', 'inventory_management'].includes(userRole) && (
  <button
    onClick={() => setShowStateOverride(!showStateOverride)}
    className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition"
  >
    {showStateOverride ? 'Cancel' : '🔄 Change State'}
  </button>
)}

{/* State Override Form */}
{showStateOverride && (
  <div className="bg-slate-700 border border-slate-600 p-4 rounded-lg space-y-3">
    <select
      value={newState}
      onChange={(e) => setNewState(e.target.value as BoxState)}
      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <option value="received">Received</option>
      <option value="in_use">In Use</option>
      <option value="ready_for_checkout">Ready for Checkout</option>
      <option value="departed">Departed</option>
    </select>
    <textarea
      placeholder="Reason for change *"
      value={overrideReason}
      onChange={(e) => setOverrideReason(e.target.value)}
      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
      rows={2}
    />
    <button
      onClick={overrideBoxState}
      disabled={overridingState || !overrideReason.trim()}
      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
    >
      {overridingState ? 'Updating...' : 'Confirm Change'}
    </button>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "Dashboard"
```
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "refactor: remove inline state override form from dashboard bottom sheet"
```

---

### Task 3: Add edit modal state, functions, and icon

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add six modal state variables after the existing userRole state**

```tsx
const [editModalOpen, setEditModalOpen] = useState(false);
const [editState, setEditState] = useState<BoxState>('received');
const [editCondition, setEditCondition] = useState('ok');
const [editNotes, setEditNotes] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [editError, setEditError] = useState('');
```

- [ ] **Step 2: Add handleOpenEdit function after handleSelectBox**

```tsx
function handleOpenEdit() {
  setEditState((selectedBox?.currentState || 'received') as BoxState);
  setEditCondition(history[0]?.condition ?? 'ok');
  setEditNotes('');
  setEditError('');
  setEditModalOpen(true);
}
```

- [ ] **Step 3: Add handleSaveEdit function after handleOpenEdit**

```tsx
async function handleSaveEdit() {
  if (!selectedBox || isSaving) return;
  setIsSaving(true);
  setEditError('');
  try {
    await axios.post(`/api/boxes/${selectedBox.id}/state-override`, {
      newState: editState,
      condition: editCondition,
      notes: editNotes || undefined,
    });
    setEditModalOpen(false);
    fetchBoxes();
    handleSelectBox(selectedBox);
  } catch (error: any) {
    setEditError(error.response?.data?.error || 'Failed to save changes');
  } finally {
    setIsSaving(false);
  }
}
```

- [ ] **Step 4: Replace the bottom sheet header close button with a header row that includes the edit icon**

Find:
```tsx
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-50">
                  {selectedBox.label || 'Unlabeled'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">{selectedBox.qrCode}</p>
              </div>
              <button
                onClick={() => setSelectedBox(null)}
                className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
              >
                ✕
              </button>
            </div>
```

Replace with:
```tsx
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-50">
                  {selectedBox.label || 'Unlabeled'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">{selectedBox.qrCode}</p>
              </div>
              <div className="flex items-center gap-1">
                {userRole && ['admin', 'inventory_management'].includes(userRole) && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                    title="Edit box"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => setSelectedBox(null)}
                  className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "Dashboard"
```
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: add edit icon and modal state/functions to dashboard"
```

---

### Task 4: Add modal JSX

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add the modal just before the closing `</>` of the component return**

Find the last two lines of the return:
```tsx
      {/* Mobile overlay when details open */}
      {selectedBox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
          onClick={() => setSelectedBox(null)}
        />
      )}
    </>
```

Replace with:
```tsx
      {/* Mobile overlay when details open */}
      {selectedBox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
          onClick={() => setSelectedBox(null)}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setEditModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-lg font-bold text-slate-50">
                  Edit — {selectedBox?.label || selectedBox?.qrCode}
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value as BoxState)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="received">Received</option>
                    <option value="in_use">In Use</option>
                    <option value="ready_for_checkout">Ready for Checkout</option>
                    <option value="departed">Departed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Condition</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'ok', label: '✓ OK' },
                      { value: 'damaged', label: '⚠️ Damaged' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEditCondition(opt.value)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-sm ${
                          editCondition === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe the change..."
                  />
                </div>
                {editError && (
                  <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                    {editError}
                  </p>
                )}
              </div>
              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects"
```
Expected: no errors from Dashboard or state-override

- [ ] **Step 3: Manual smoke test**

1. Open Dashboard, click any box → bottom sheet opens
2. As admin/inventory_management: confirm ✏️ icon appears next to ✕
3. Click ✏️ → modal opens with current state pre-selected, condition pre-filled
4. Change state, set condition to Damaged, add a note → click Save
5. Modal closes, history list in bottom sheet shows new entry with the correct state, condition, and note
6. As read_only/installation user: confirm ✏️ icon does NOT appear

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: box edit dialog — state, condition, notes from dashboard"
```

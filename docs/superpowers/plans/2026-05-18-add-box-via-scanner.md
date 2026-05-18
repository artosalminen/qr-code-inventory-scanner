# Add Box via Scanner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow inventory managers and admins to add new boxes directly from the Scanner page — via an unrecognized QR scan in Check In mode, or via manual entry — and immediately set the box to RECEIVED state.

**Architecture:** All changes are in `src/pages/scanner.tsx` (UI + logic) and `src/pages/api/projects/[id]/boxes.ts` (pass condition/notes to initial state history). The boxes POST API already creates a box and sets it to RECEIVED in one atomic operation — we just extend it to carry condition and notes. No new endpoints needed.

**Tech Stack:** Next.js Pages Router, React hooks, Tailwind CSS, Axios, Prisma (via existing API)

---

## File Map

| File | Change |
|---|---|
| `src/pages/api/projects/[id]/boxes.ts` | Accept `condition` and `notes` in POST body; pass to BoxStateHistory |
| `src/pages/scanner.tsx` | Add role fetch, add-box state, form UI, and unknown-scan detection |

---

### Task 1: Extend boxes API to record condition and notes

**Files:**
- Modify: `src/pages/api/projects/[id]/boxes.ts`

- [ ] **Step 1: Add condition and notes to POST body destructuring**

In `handlePost`, change:
```ts
const { qrCode, label, description } = req.body;
```
to:
```ts
const { qrCode, label, description, condition, notes } = req.body;
```

- [ ] **Step 2: Pass condition and notes into the BoxStateHistory create**

Change:
```ts
await prisma.boxStateHistory.create({
  data: {
    boxId: box.id,
    state: 'received',
    stateSetBy: req.userId,
    changeType: 'state_change',
  },
});
```
to:
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

- [ ] **Step 3: Verify the server compiles — check terminal for TypeScript errors**

Expected: no errors in `src/pages/api/projects/[id]/boxes.ts`

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/projects/[id]/boxes.ts
git commit -m "feat: pass condition and notes to initial box state history"
```

---

### Task 2: Add role fetching to Scanner page

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add userRole state after the existing isProcessing state**

```tsx
const [userRole, setUserRole] = useState<string | null>(null);
```

- [ ] **Step 2: Add fetchProjectRole function after fetchProjects**

```tsx
async function fetchProjectRole(projectId: string) {
  try {
    const { data } = await axios.get(`/api/projects/${projectId}`);
    const currentUserProject = data.projectUsers?.find(
      (pu: any) => pu.userId === (session?.user as any)?.id,
    );
    setUserRole(currentUserProject?.role || null);
  } catch {
    setUserRole(null);
  }
}
```

- [ ] **Step 3: Add useEffect to call fetchProjectRole when selectedProjectId changes**

Add after the existing `useEffect(() => { fetchProjects(); }, [])`:
```tsx
useEffect(() => {
  if (selectedProjectId) {
    fetchProjectRole(selectedProjectId);
  }
}, [selectedProjectId, session]);
```

- [ ] **Step 4: Add canAddBoxes derived value before the return statement**

Add after the `scanModes` array definition:
```tsx
const canAddBoxes =
  scanMode === 'check_in' &&
  ['admin', 'inventory_management'].includes(userRole ?? '');
```

- [ ] **Step 5: Verify the page loads without errors — open /scanner in browser**

Expected: scanner page loads, no console errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: fetch user role in scanner page"
```

---

### Task 3: Add add-box state, handleAddBox, and unknown-scan detection

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add add-box state variables after userRole state**

```tsx
const [addBoxFormOpen, setAddBoxFormOpen] = useState(false);
const [addBoxQr, setAddBoxQr] = useState('');
const [addBoxLabel, setAddBoxLabel] = useState('');
const [addBoxError, setAddBoxError] = useState('');
const [isAddingBox, setIsAddingBox] = useState(false);
```

- [ ] **Step 2: Add a reset effect so the form closes when project or mode changes**

Add after the `fetchProjectRole` useEffect:
```tsx
useEffect(() => {
  setAddBoxFormOpen(false);
  setAddBoxQr('');
  setAddBoxLabel('');
  setAddBoxError('');
}, [selectedProjectId, scanMode]);
```

- [ ] **Step 3: Add handleAddBox function after handleScan**

```tsx
async function handleAddBox() {
  if (!addBoxQr.trim() || !selectedProjectId || isAddingBox) return;
  setIsAddingBox(true);
  setAddBoxError('');
  try {
    await axios.post(`/api/projects/${selectedProjectId}/boxes`, {
      qrCode: addBoxQr.trim(),
      label: addBoxLabel.trim() || undefined,
      condition,
      notes: notes || undefined,
    });
    setLastMessage(`Box "${addBoxQr.trim()}" added and checked in`);
    setLastMessageType('success');
    setAddBoxFormOpen(false);
    setAddBoxQr('');
    setAddBoxLabel('');
    setScannerOpen(false);
  } catch (error: any) {
    setAddBoxError(error.response?.data?.error || 'Failed to add box');
  } finally {
    setIsAddingBox(false);
  }
}
```

- [ ] **Step 4: Modify handleScan to trigger the add-box form on unknown QR**

Replace the catch block in `handleScan`:
```tsx
} catch (error: any) {
  const isNotFound = error.response?.status === 404;
  if (isNotFound && canAddBoxes) {
    setAddBoxFormOpen(true);
    setAddBoxQr(qrCode);
    setAddBoxLabel('');
    setAddBoxError('');
    setScannerOpen(false);
  } else {
    const message = error.response?.data?.error || 'Scan failed';
    setLastMessage(message);
    setLastMessageType('error');
  }
} finally {
  setIsProcessing(false);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add handleAddBox and unknown-scan detection logic"
```

---

### Task 4: Render the add-box form and manual entry button

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Replace the Status Message block with a conditional that shows either the add-box form or the normal status message**

Find the existing Status Message block:
```tsx
{/* Status Message */}
{lastMessage && (
  <div
    className={`p-4 rounded-lg font-semibold flex items-center gap-3 transition ${
      lastMessageType === 'success'
        ? 'bg-green-900 border border-green-600 text-green-200'
        : 'bg-red-900 border border-red-600 text-red-200'
    }`}
  >
    <span className="text-2xl">
      {lastMessageType === 'success' ? '✓' : '✗'}
    </span>
    <span>{lastMessage}</span>
  </div>
)}
```

Replace it with:
```tsx
{/* Add Box Form — shown on unknown scan or manual add */}
{addBoxFormOpen ? (
  <div className="bg-slate-700 border border-green-600 rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between mb-1">
      <h3 className="font-semibold text-slate-50">Add New Box</h3>
      <button
        onClick={() => setAddBoxFormOpen(false)}
        className="text-slate-400 hover:text-slate-200 transition"
      >
        ✕
      </button>
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">QR Code *</label>
      <input
        type="text"
        value={addBoxQr}
        onChange={(e) => setAddBoxQr(e.target.value)}
        placeholder="QR code..."
        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">Label (optional)</label>
      <input
        type="text"
        value={addBoxLabel}
        onChange={(e) => setAddBoxLabel(e.target.value)}
        placeholder="Human-readable label..."
        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
    <div className="text-xs text-slate-400 bg-slate-600 rounded-lg px-3 py-2">
      Condition: <span className="text-slate-200 font-medium capitalize">{condition}</span>
      {notes && <> · Notes: <span className="text-slate-200 font-medium">{notes}</span></>}
    </div>
    {addBoxError && (
      <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
        {addBoxError}
      </p>
    )}
    <button
      onClick={handleAddBox}
      disabled={isAddingBox || !addBoxQr.trim()}
      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95"
    >
      {isAddingBox ? 'Adding...' : 'Add & Check In'}
    </button>
  </div>
) : (
  /* Status Message */
  lastMessage && (
    <div
      className={`p-4 rounded-lg font-semibold flex items-center gap-3 transition ${
        lastMessageType === 'success'
          ? 'bg-green-900 border border-green-600 text-green-200'
          : 'bg-red-900 border border-red-600 text-red-200'
      }`}
    >
      <span className="text-2xl">
        {lastMessageType === 'success' ? '✓' : '✗'}
      </span>
      <span>{lastMessage}</span>
    </div>
  )
)}
```

- [ ] **Step 2: Add "Add Box Manually" button after the Scanner Toggle Button**

Find the Touch Hint block:
```tsx
{/* Touch Hint for Mobile */}
<div className="text-center text-xs text-slate-400 bg-slate-700 rounded-lg p-3">
  💡 Position the camera to scan QR codes
</div>
```

Add the manual button immediately before it:
```tsx
{/* Manual Add Box Button */}
{canAddBoxes && !addBoxFormOpen && (
  <button
    onClick={() => {
      setAddBoxFormOpen(true);
      setAddBoxQr('');
      setAddBoxLabel('');
      setAddBoxError('');
    }}
    className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-dashed border-slate-500 text-slate-300 rounded-lg font-medium transition flex items-center justify-center gap-2"
  >
    <span>➕</span>
    Add Box Manually
  </button>
)}

{/* Touch Hint for Mobile */}
<div className="text-center text-xs text-slate-400 bg-slate-700 rounded-lg p-3">
  💡 Position the camera to scan QR codes
</div>
```

- [ ] **Step 3: Manual smoke test — check in mode, authorized user**

1. Go to `/scanner`, select Check In mode
2. Confirm "Add Box Manually" button appears
3. Click it — add-box form should appear with empty QR field
4. Enter a new QR code and label, click "Add & Check In"
5. Expect green success message, form closes
6. Verify box appears in Dashboard with RECEIVED state

- [ ] **Step 4: Manual smoke test — unknown scan**

1. In Check In mode, open scanner
2. Scan a QR code not in the project
3. Expect form to appear with QR pre-filled (no red error message)
4. Confirm or cancel

- [ ] **Step 5: Manual smoke test — non-authorized user**

1. Log in as an installation role user
2. Go to Scanner in Check In mode
3. Confirm "Add Box Manually" button does NOT appear
4. Scan an unknown QR — confirm red error message appears (not the add form)

- [ ] **Step 6: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add box via scanner — inline form and manual entry button"
```

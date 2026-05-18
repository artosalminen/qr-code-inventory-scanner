# Edit Box Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins and inventory managers to edit a box's label inline from the admin project page.

**Architecture:** A new `PATCH /api/projects/[id]/boxes/[boxId]` endpoint updates the box label. The admin project page gains a pencil icon per box that toggles an inline text input, consistent with the existing "Change State" expansion pattern.

**Tech Stack:** Next.js Pages Router, React hooks, Tailwind CSS, Axios, Prisma

---

## File Map

| File | Change |
|---|---|
| `src/pages/api/projects/[id]/boxes/[boxId].ts` | New — PATCH handler to update box label |
| `src/pages/admin/projects/[id].tsx` | Add edit icon, inline label edit state and form |

---

### Task 1: Create PATCH box label API endpoint

**Files:**
- Create: `src/pages/api/projects/[id]/boxes/[boxId].ts`

- [ ] **Step 1: Create the file**

```ts
import { NextApiResponse } from 'next';
import { withProjectRole, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id, boxId } = req.query;
  if (typeof id !== 'string' || typeof boxId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withProjectRole(req, res, id, ['admin', 'inventory_management']);
  if (!req.userId) return;

  const { label } = req.body;
  if (label !== undefined && typeof label !== 'string') {
    return res.status(400).json({ error: 'Label must be a string' });
  }

  try {
    const box = await prisma.box.update({
      where: { id: boxId },
      data: { label: label?.trim() || null },
    });
    return res.status(200).json(box);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Box not found' });
    }
    console.error('Error updating box:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "boxId"
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add "src/pages/api/projects/[id]/boxes/[boxId].ts"
git commit -m "feat: PATCH endpoint to update box label"
```

---

### Task 2: Add inline label edit to admin project page

**Files:**
- Modify: `src/pages/admin/projects/[id].tsx`

- [ ] **Step 1: Add four label-edit state variables after the existing state override variables**

Add after `const [overridingState, setOverridingState] = useState(false);`:
```tsx
  const [editingLabelBoxId, setEditingLabelBoxId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState('');
```

- [ ] **Step 2: Add saveLabel function after overrideBoxState**

```tsx
  async function saveLabel(boxId: string) {
    if (!id || savingLabel) return;
    setSavingLabel(true);
    setLabelError('');
    try {
      await axios.patch(`/api/projects/${id}/boxes/${boxId}`, {
        label: editingLabelValue,
      });
      setEditingLabelBoxId(null);
      fetchProjectData();
    } catch (error: any) {
      setLabelError(error.response?.data?.error || 'Failed to save label');
    } finally {
      setSavingLabel(false);
    }
  }
```

- [ ] **Step 3: Add the edit icon and inline form to each box row**

Find the box row header section:
```tsx
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-50 truncate">{box.qrCode}</div>
                          {box.label && (
                            <div className="text-sm text-slate-400 truncate">{box.label}</div>
                          )}
                          <div className="mt-2 inline-block">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-200 capitalize">
                              {currentState}
                            </span>
                          </div>
                        </div>
                        {canManageBoxes && (
                          <button
                            onClick={() => setSelectedBoxId(box.id)}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition active:scale-95"
                          >
                            Change State
                          </button>
                        )}
```

Replace with:
```tsx
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-50 truncate">{box.qrCode}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-slate-400 truncate">{box.label || <span className="italic text-slate-500">No label</span>}</span>
                            {canManageBoxes && (
                              <button
                                onClick={() => {
                                  setEditingLabelBoxId(box.id);
                                  setEditingLabelValue(box.label || '');
                                  setLabelError('');
                                  setSelectedBoxId(null);
                                }}
                                className="text-slate-500 hover:text-slate-300 transition shrink-0"
                                title="Edit label"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                          <div className="mt-2 inline-block">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-200 capitalize">
                              {currentState}
                            </span>
                          </div>
                        </div>
                        {canManageBoxes && (
                          <button
                            onClick={() => { setSelectedBoxId(box.id); setEditingLabelBoxId(null); }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition active:scale-95"
                          >
                            Change State
                          </button>
                        )}
```

- [ ] **Step 4: Add the inline label edit form after the state override form block**

Find the closing tag of the state override block (after the Cancel button and its surrounding divs):
```tsx
                      )}
                    </div>
                  );
                })}
```

This is the end of `boxes.map(...)`. Instead, find the end of the state override expansion block and add the label edit form right after it, inside the same box card div. The override block ends with:
```tsx
                      {selectedBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          ...
                        </div>
                      )}
```

Add immediately after that `)}` (but still inside the box card `<div key={box.id} ...>`):
```tsx
                      {editingLabelBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          <label className="block text-sm font-medium text-slate-300">Edit Label</label>
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            placeholder="Box label..."
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(box.id); if (e.key === 'Escape') setEditingLabelBoxId(null); }}
                            autoFocus
                          />
                          {labelError && (
                            <p className="text-sm text-red-400">{labelError}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveLabel(box.id)}
                              disabled={savingLabel}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                            >
                              {savingLabel ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingLabelBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects" | head -10
```
Expected: no errors

- [ ] **Step 6: Manual smoke test**

1. Go to Admin → manage a project
2. Each box row shows ✏️ next to the label (or "No label" placeholder)
3. Click ✏️ → inline input appears pre-filled with current label; Enter/Escape work
4. Change label, click Save → row updates with new label
5. Click ✏️ while Change State is open → Change State closes, edit opens (and vice versa)

- [ ] **Step 7: Commit and push**

```bash
git add "src/pages/admin/projects/[id].tsx" docs/superpowers/plans/2026-05-18-edit-box-label.md
git commit -m "feat: inline label edit for boxes in admin project page"
git push origin main
```

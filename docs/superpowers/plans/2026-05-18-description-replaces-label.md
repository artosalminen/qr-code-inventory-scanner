# Description Replaces Label in UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Label references in the UI with Description — display `box.description` where `box.label` was shown, send `description` to APIs, and remove the separate "Label" input from the Add Box form.

**Architecture:** Pure field rename. The admin Add Box form already has both a "Label" input and a "Description" textarea — the Label input is removed and Description textarea becomes the sole human text field. `label` DB column untouched.

**Tech Stack:** Next.js Pages Router, React, Tailwind CSS, Axios, Prisma

---

## File Map

| File | Change |
|---|---|
| `src/pages/api/projects/[id]/boxes/[boxId].ts` | Read/write `description` instead of `label` |
| `src/components/Dashboard.tsx` | Show `box.description` in card and bottom sheet |
| `src/pages/admin/projects/[id].tsx` | 7 targeted edits — see tasks below |
| `src/pages/scanner.tsx` | Rename form field, send `description` |

---

### Task 1: Update PATCH endpoint to write description

**Files:**
- Modify: `src/pages/api/projects/[id]/boxes/[boxId].ts`

- [ ] **Step 1: Replace label with description throughout**

Change:
```ts
  const { label } = req.body;
  if (label !== undefined && typeof label !== 'string') {
    return res.status(400).json({ error: 'Label must be a string' });
  }

  try {
    const box = await prisma.box.update({
      where: { id: boxId },
      data: { label: label?.trim() || null },
    });
```

To:
```ts
  const { description } = req.body;
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  try {
    const box = await prisma.box.update({
      where: { id: boxId },
      data: { description: description?.trim() || null },
    });
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "boxId" | head -5
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add "src/pages/api/projects/[id]/boxes/[boxId].ts"
git commit -m "feat: PATCH box endpoint updates description instead of label"
```

---

### Task 2: Update Dashboard to show description

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Update box card secondary line**

Find:
```tsx
              <div className="text-xs sm:text-sm text-slate-300 mt-1">{box.label || '-'}</div>
```

Replace with:
```tsx
              <div className="text-xs sm:text-sm text-slate-300 mt-1">{box.description || '-'}</div>
```

- [ ] **Step 2: Update bottom sheet title**

Find:
```tsx
                <h3 className="text-lg sm:text-2xl font-bold text-slate-50">
                  {selectedBox.label || 'Unlabeled'}
                </h3>
```

Replace with:
```tsx
                <h3 className="text-lg sm:text-2xl font-bold text-slate-50">
                  {selectedBox.description || selectedBox.qrCode}
                </h3>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "Dashboard" | head -5
```
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: show box description instead of label in dashboard"
```

---

### Task 3: Update admin project page

**Files:**
- Modify: `src/pages/admin/projects/[id].tsx`

- [ ] **Step 1: Update box row display from label to description**

Find:
```tsx
                              {box.label || <span className="italic text-slate-500">No label</span>}
```

Replace with:
```tsx
                              {box.description || <span className="italic text-slate-500">No description</span>}
```

- [ ] **Step 2: Update edit icon pre-fill to use description**

Find:
```tsx
                                  setEditingLabelValue(box.label || '');
```

Replace with:
```tsx
                                  setEditingLabelValue(box.description || '');
```

- [ ] **Step 3: Rename the inline edit form title**

Find:
```tsx
                          <label className="block text-sm font-medium text-slate-300">Edit Label</label>
```

Replace with:
```tsx
                          <label className="block text-sm font-medium text-slate-300">Edit Description</label>
```

- [ ] **Step 4: Update saveLabel to patch description**

Find:
```tsx
      await axios.patch(`/api/projects/${id}/boxes/${boxId}`, {
        label: editingLabelValue,
      });
```

Replace with:
```tsx
      await axios.patch(`/api/projects/${id}/boxes/${boxId}`, {
        description: editingLabelValue,
      });
```

- [ ] **Step 5: Remove label from addBox API call and reset**

Find:
```tsx
      await axios.post(`/api/projects/${id}/boxes`, {
        qrCode: boxQrCode,
        label: boxLabel,
        description: boxDescription,
      });
      setBoxQrCode('');
      setBoxLabel('');
      setBoxDescription('');
```

Replace with:
```tsx
      await axios.post(`/api/projects/${id}/boxes`, {
        qrCode: boxQrCode,
        description: boxDescription,
      });
      setBoxQrCode('');
      setBoxDescription('');
```

- [ ] **Step 6: Remove the Label input from the Add Box form**

Find and delete this input entirely:
```tsx
                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={boxLabel}
                    onChange={(e) => setBoxLabel(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects" | head -10
```
Expected: no errors (unused `boxLabel` state is a warning at most, not an error)

- [ ] **Step 8: Commit**

```bash
git add "src/pages/admin/projects/[id].tsx"
git commit -m "feat: replace label with description in admin project page"
```

---

### Task 4: Update scanner Add Box forms

**Files:**
- Modify: `src/pages/scanner.tsx`

There are two identical add-box form blocks in scanner.tsx (confirmation card and main scanner card).

- [ ] **Step 1: Rename both form field labels — replace_all**

Both forms have the same markup. Using replace_all, change:
```tsx
                  <label className="block text-xs font-medium text-slate-400 mb-1">Label (optional)</label>
                  <input
                    type="text"
                    value={addBoxLabel}
                    onChange={(e) => setAddBoxLabel(e.target.value)}
                    placeholder="Human-readable label..."
```

To:
```tsx
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={addBoxLabel}
                    onChange={(e) => setAddBoxLabel(e.target.value)}
                    placeholder="Human-readable description..."
```

- [ ] **Step 2: Update handleAddBox to send description**

Find:
```tsx
      await axios.post(`/api/projects/${selectedProjectId}/boxes`, {
        qrCode: addBoxQr.trim(),
        label: addBoxLabel.trim() || undefined,
        condition,
        notes: notes || undefined,
      });
```

Replace with:
```tsx
      await axios.post(`/api/projects/${selectedProjectId}/boxes`, {
        qrCode: addBoxQr.trim(),
        description: addBoxLabel.trim() || undefined,
        condition,
        notes: notes || undefined,
      });
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects" | head -10
```
Expected: no errors

- [ ] **Step 4: Commit and push**

```bash
git add src/pages/scanner.tsx docs/superpowers/plans/2026-05-18-description-replaces-label.md
git commit -m "feat: replace label with description in scanner add-box form"
git push origin main
```

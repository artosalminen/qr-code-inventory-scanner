# Scanner Pre-Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After scanning a QR code, immediately show the box's current state and whether the intended action is valid before displaying the confirmation form.

**Architecture:** New read-only `/api/boxes/preview` endpoint validates the state transition server-side and returns the box state + validity. Scanner UI enters a preview phase: fetch box info, display status card (valid/invalid), then conditionally show the form.

**Tech Stack:** Next.js API route, Prisma (for box + state history queries), React state

---

### Task 1: Create `/api/boxes/preview` endpoint

**Files:**
- Create: `src/pages/api/boxes/preview.ts`
- Reference: `src/lib/state-machine.ts` (for transition validation)

- [ ] **Step 1: Create the preview endpoint file**

```typescript
// src/pages/api/boxes/preview.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { canTransition } from '@/lib/state-machine';

type PreviewResponse = 
  | { box: { id: string; label: string; qrCode: string; currentState: string }; valid: true }
  | { box: { id: string; label: string; qrCode: string; currentState: string } | null; valid: false; reason: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreviewResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ box: null, valid: false, reason: 'Method not allowed' });
  }

  const { qrCode, projectId, action } = req.query;

  if (!qrCode || !projectId || !action) {
    return res.status(400).json({ box: null, valid: false, reason: 'Missing required parameters' });
  }

  // Validate session
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ box: null, valid: false, reason: 'Unauthorized' });
  }

  try {
    // Validate user has a role in the project
    const projectUser = await prisma.projectUsers.findUnique({
      where: {
        projectId_userId: {
          projectId: projectId as string,
          userId: session.user.email,
        },
      },
    });

    if (!projectUser) {
      return res.status(403).json({ box: null, valid: false, reason: 'Unauthorized' });
    }

    // Find box
    const box = await prisma.boxes.findFirst({
      where: {
        projectId: projectId as string,
        qrCode: qrCode as string,
      },
    });

    if (!box) {
      return res.status(200).json({ box: null, valid: false, reason: 'Box not found in this project' });
    }

    // Get current state from latest history entry
    const latestHistory = await prisma.boxStateHistory.findFirst({
      where: { boxId: box.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const currentState = latestHistory?.toState || 'expected';

    // Validate transition
    const actionStr = action as string;
    const canDo = canTransition(currentState, actionStr, projectUser.role);

    if (!canDo.valid) {
      return res.status(200).json({
        box: { id: box.id, label: box.label, qrCode: box.qrCode, currentState },
        valid: false,
        reason: canDo.reason || 'Invalid state transition',
      });
    }

    // For 'activate' action, check if box is already in use (get who)
    if (actionStr === 'activate' && currentState === 'in_use') {
      const session = await prisma.boxInUseSession.findFirst({
        where: { boxId: box.id, endedAt: null },
        include: { user: true },
      });
      const username = session?.user?.name || 'unknown user';
      return res.status(200).json({
        box: { id: box.id, label: box.label, qrCode: box.qrCode, currentState },
        valid: false,
        reason: `Box is already in use by ${username}`,
      });
    }

    return res.status(200).json({
      box: { id: box.id, label: box.label, qrCode: box.qrCode, currentState },
      valid: true,
    });
  } catch (error) {
    console.error('preview endpoint error:', error);
    return res.status(500).json({ box: null, valid: false, reason: 'Server error' });
  }
}
```

- [ ] **Step 2: Check state-machine.ts exports canTransition function**

Read `src/lib/state-machine.ts` and verify the `canTransition` function exists and returns `{ valid: boolean; reason?: string }`. If it doesn't exist or returns a different shape, create it:

```typescript
// Add to src/lib/state-machine.ts if not present
export function canTransition(
  fromState: string,
  action: string,
  role: string
): { valid: boolean; reason?: string } {
  // Validate role can perform action
  const roleCanDo = {
    check_in: ['admin', 'inventory_management'],
    activate: ['admin', 'inventory_management', 'installation'],
    return: ['admin', 'inventory_management', 'installation'],
    check_out: ['admin', 'inventory_management'],
  };

  if (!roleCanDo[action as keyof typeof roleCanDo]?.includes(role)) {
    return { valid: false, reason: 'Your role cannot perform this action' };
  }

  // Validate state machine transition
  const transitions = {
    check_in: ['expected', 'received'],
    activate: ['received'],
    return: ['in_use'],
    check_out: ['ready_for_checkout', 'received'],
  };

  const allowedStates = transitions[action as keyof typeof transitions];
  if (!allowedStates?.includes(fromState)) {
    return { valid: false, reason: `Box is in state ${fromState} — cannot ${action}` };
  }

  return { valid: true };
}
```

- [ ] **Step 3: Commit the preview endpoint**

```bash
git add src/pages/api/boxes/preview.ts src/lib/state-machine.ts
git commit -m "feat: add /api/boxes/preview endpoint for scanner validation"
```

---

### Task 2: Add PreviewState type and fetch logic to scanner.tsx

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add PreviewState type at top of file**

After imports, add:

```typescript
type BoxPreview = { id: string; label: string; qrCode: string; currentState: string };

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; box: BoxPreview }
  | { status: 'invalid'; box: BoxPreview | null; reason: string }
  | { status: 'offline' };
```

- [ ] **Step 2: Add preview state variable in the Scanner component**

Find the main `export default function Scanner()` function. Inside the component (after existing `useState` calls), add:

```typescript
const [preview, setPreview] = useState<PreviewState>({ status: 'idle' });
```

- [ ] **Step 3: Update handleScan to set preview state**

Find the existing `const handleScan = useCallback(() => { ... })` function. Replace it with:

```typescript
const handleScan = useCallback((decodedText: string) => {
  if (!isOnline) {
    setPreview({ status: 'offline' });
  } else {
    setPreview({ status: 'loading' });
  }
  setPendingScanQr(decodedText);
  setScannerOpen(false);
  setLastMessage(null);
}, [isOnline]);
```

- [ ] **Step 4: Add useEffect to fetch preview data**

After the `handleScan` function, add:

```typescript
useEffect(() => {
  if (!pendingScanQr || preview.status === 'offline') return;

  const fetchPreview = async () => {
    try {
      const searchParams = new URLSearchParams({
        qrCode: pendingScanQr,
        projectId: projectId || '',
        action: scanMode,
      });

      const response = await fetch(`/api/boxes/preview?${searchParams}`);
      const data = await response.json();

      if (data.valid) {
        setPreview({ status: 'valid', box: data.box });
      } else {
        setPreview({ status: 'invalid', box: data.box || null, reason: data.reason });
      }
    } catch (error) {
      console.error('preview fetch error:', error);
      setPreview({ status: 'invalid', box: null, reason: 'Failed to validate box' });
    }
  };

  fetchPreview();
}, [pendingScanQr, scanMode, projectId, preview.status]);
```

- [ ] **Step 5: Update the cancel/rescan handler**

Find where `pendingScanQr` is reset (likely in a "Rescan" button handler or close function). Also reset preview there:

```typescript
const handleRescan = () => {
  setPendingScanQr(null);
  setPreview({ status: 'idle' });
  setNotes('');
  setPendingImages([]);
  setSelectedCondition(null);
  setScannerOpen(true);
};
```

Use this handler in the Rescan button. If there's already a rescan handler, just add `setPreview({ status: 'idle' });` to it.

- [ ] **Step 6: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add preview state and fetch logic to scanner"
```

---

### Task 3: Add status card and conditional form rendering in scanner.tsx

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add status card render above the confirmation form**

Find the existing confirmation form (look for `pendingScanQr !== null` check around line 414). Before the form, add the status card:

```typescript
{pendingScanQr !== null && (
  <>
    {/* Status Card */}
    <div className="mb-4 p-4 rounded-lg border">
      {preview.status === 'loading' && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-gray-800 mb-2"></div>
          <p className="text-sm text-gray-600">Checking box status…</p>
        </div>
      )}

      {preview.status === 'valid' && (
        <div className="border-l-4 border-green-500 bg-green-50 p-3">
          <div className="font-semibold text-lg">{preview.box.label}</div>
          <div className="text-sm text-gray-700 mt-1">
            Current state: <span className="inline-block px-2 py-1 bg-gray-200 rounded text-xs font-mono mt-1">{preview.box.currentState}</span>
          </div>
          <div className="text-sm text-green-700 font-medium mt-2">✓ Ready to {scanMode}</div>
        </div>
      )}

      {preview.status === 'invalid' && (
        <div className="border-l-4 border-red-500 bg-red-50 p-3">
          {preview.box && (
            <>
              <div className="font-semibold text-lg">{preview.box.label}</div>
              <div className="text-sm text-gray-700 mt-1">
                Current state: <span className="inline-block px-2 py-1 bg-gray-200 rounded text-xs font-mono mt-1">{preview.box.currentState}</span>
              </div>
            </>
          )}
          <div className="text-sm text-red-700 font-medium mt-2">✗ {preview.reason}</div>
        </div>
      )}

      {preview.status === 'offline' && (
        <div className="text-xs text-gray-500 italic">Offline — validation skipped</div>
      )}
    </div>

    {/* Confirmation Form — only show if valid or offline */}
    {(preview.status === 'valid' || preview.status === 'offline') && (
      <div className="space-y-3">
        {/* Existing form content: condition, notes, photos, buttons */}
        {/* ... keep all existing form JSX here ... */}
      </div>
    )}

    {/* Rescan Button — show if invalid */}
    {preview.status === 'invalid' && (
      <button
        onClick={handleRescan}
        className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300"
      >
        Rescan
      </button>
    )}
  </>
)}
```

- [ ] **Step 2: Move existing form JSX inside the conditional**

Find the entire existing confirmation form (condition selector, notes, photos, action buttons). Cut it and paste it inside the `{(preview.status === 'valid' || preview.status === 'offline') && (` block above.

- [ ] **Step 3: Update the confirm button handler to reset preview**

Find the `handleConfirm` function. At the end (after successful confirm), add:

```typescript
setPreview({ status: 'idle' });
```

- [ ] **Step 4: Verify offline path still works**

When offline, `preview.status === 'offline'`, the form should be visible, and behavior is unchanged from today. The status card shows a subtle message. This is handled by the conditional above.

- [ ] **Step 5: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add preview status card and conditional form rendering"
```

---

### Task 4: Manual testing

**Files:**
- No new files; test in browser

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: `ready - started server on 0.0.0.0:3000`

- [ ] **Step 2: Test valid transition (check_in on expected box)**

1. Navigate to scanner page
2. Create a test box in EXPECTED state (or import one via CSV)
3. Scan the QR code
4. Observe: Status card appears with "Checking box status…" spinner for ~500ms
5. Then: Green card shows box name, "Current state: expected", "✓ Ready to check_in"
6. Form appears below with condition / notes / photos
7. Confirm the action
8. Observe: Success message, history updated

- [ ] **Step 3: Test invalid transition (activate on departed box)**

1. Scan a box in DEPARTED state
2. Observe: Status card appears loading
3. Then: Red card shows box name, "Current state: departed", "✗ Box is in state departed — cannot activate"
4. Form is hidden; only Rescan button visible
5. Click Rescan, scanner reopens

- [ ] **Step 4: Test box not found**

1. Manually enter a QR code for a box that doesn't exist in this project
2. Scan (or click a fake QR code)
3. Observe: Red card with no box name, "✗ Box not found in this project"

- [ ] **Step 5: Test offline scenario**

1. Open DevTools (F12) → Network tab
2. Set throttling to "Offline" or disable network
3. Scan a QR code
4. Observe: Status card shows "Offline — validation skipped" (subtle italic gray text)
5. Form appears normally
6. User can fill notes/photos and confirm (will queue if offline)
7. Re-enable network

- [ ] **Step 6: Test role-based denial**

1. As Installation user, try to scan and check_in a box (should fail)
2. Observe: Red card shows "✗ Your role cannot perform this action"

- [ ] **Step 7: Commit all manual testing notes (optional)**

```bash
# No code changes, just document testing in git
git status  # Should show clean working directory
```

---

## Self-Review

**Spec coverage:**
- ✓ New `/api/boxes/preview` endpoint (Task 1)
- ✓ PreviewState UI flow in scanner.tsx (Tasks 2-3)
- ✓ Status card with box name + current state + validity (Task 3)
- ✓ Conditional form visibility: valid→show, invalid→hide (Task 3)
- ✓ Human-readable error reasons (Task 1, endpoint logic)
- ✓ Offline handling: skip preview, show form as today (Tasks 2-3)
- ✓ "Checking box status…" loading state (Task 3)

**Placeholder scan:** No TBDs, no vague steps. All code provided.

**Type consistency:** `BoxPreview`, `PreviewState`, `canTransition` return shape all match across tasks.

**No external references:** All functions/types defined in the tasks.

---

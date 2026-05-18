# Role-Based Scanner Restrictions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the Scanner nav item for read-only-in-all-projects users, and disable Check In / Check Out scan modes for installation-role users.

**Architecture:** Extend `/api/auth/user` with a `canScan` boolean (queried server-side via Prisma), read it in `Layout.tsx` to conditionally show the Scanner nav item, and add a `disabled` flag to scan mode buttons in `scanner.tsx` based on the already-fetched per-project `userRole`.

**Tech Stack:** Next.js API Routes, Prisma, React, TypeScript, Jest

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Modify | `src/pages/api/auth/user.ts` | Add `scanRole` Prisma query + `canScan` in response |
| Create | `__tests__/auth-user.test.ts` | Unit tests for `canScan` behavior |
| Modify | `src/components/Layout.tsx` | Add `canScan` state, conditionally include Scanner nav |
| Modify | `src/pages/scanner.tsx` | Add `disabled` to scanModes, disabled styling, mode reset effect |

---

## Task 1: Add `canScan` to `/api/auth/user`

**Files:**
- Modify: `src/pages/api/auth/user.ts`
- Create: `__tests__/auth-user.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/auth-user.test.ts`:

```ts
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    projectUser: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

import handler from '@/pages/api/auth/user';
import prisma from '@/lib/db';
import type { NextApiResponse } from 'next';

const mockProjectUser = prisma.projectUser as { findFirst: jest.Mock };
const mockUser = prisma.user as { findUnique: jest.Mock };

function makeReqRes() {
  const req: any = { method: 'GET' };
  const json = jest.fn();
  const res = { status: jest.fn().mockReturnThis(), json } as unknown as NextApiResponse;
  return { req, res, json };
}

const baseUser = { id: 'user-1', email: 'a@test.com', name: 'A' };

describe('/api/auth/user — canScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.findUnique.mockResolvedValue(baseUser);
  });

  it('returns canScan: false when user has only read_only roles', async () => {
    mockProjectUser.findFirst
      .mockResolvedValueOnce(null)  // adminRole — not an admin
      .mockResolvedValueOnce(null); // scanRole — no non-read_only role found

    const { req, res, json } = makeReqRes();
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ canScan: false }));
  });

  it('returns canScan: true when user has at least one non-read_only role', async () => {
    mockProjectUser.findFirst
      .mockResolvedValueOnce(null)                       // adminRole
      .mockResolvedValueOnce({ role: 'installation' }); // scanRole — found

    const { req, res, json } = makeReqRes();
    await handler(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ canScan: true }));
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=auth-user
```

Expected: FAIL — `canScan` is not in the response yet.

- [ ] **Step 3: Update `src/pages/api/auth/user.ts`**

Replace the entire file with:

```ts
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (!req.userId) {
    return;
  }

  const [dbUser, adminRole, scanRole] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.projectUser.findFirst({
      where: { userId: req.userId, role: 'admin' },
    }),
    prisma.projectUser.findFirst({
      where: { userId: req.userId, role: { not: 'read_only' } },
    }),
  ]);

  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    isAdmin: !!adminRole,
    canScan: !!scanRole,
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=auth-user
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: All tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/auth/user.ts __tests__/auth-user.test.ts
git commit -m "feat: add canScan flag to /api/auth/user"
```

---

## Task 2: Hide Scanner nav for read-only users in Layout.tsx

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Update `src/components/Layout.tsx`**

Make two targeted changes:

**Change 1** — add `canScan` state after the `isAdmin` state (line 17):

Replace:
```tsx
const [isAdmin, setIsAdmin] = useState(false);
```
With:
```tsx
const [isAdmin, setIsAdmin] = useState(false);
const [canScan, setCanScan] = useState(true);
```

**Change 2** — read `canScan` from the API response in the existing `useEffect`:

Replace:
```tsx
      .then((res) => setIsAdmin(res.data.isAdmin ?? false))
      .catch(() => setIsAdmin(false));
```
With:
```tsx
      .then((res) => {
        setIsAdmin(res.data.isAdmin ?? false);
        setCanScan(res.data.canScan ?? true);
      })
      .catch(() => setIsAdmin(false));
```

**Change 3** — conditionally include Scanner in `navItems`:

Replace:
```tsx
  const navItems = [
    { label: t('dashboard'), path: '/dashboard', icon: '📊' },
    { label: t('scanner'), path: '/scanner', icon: '📱' },
    ...(isAdmin ? [{ label: t('admin'), path: '/admin', icon: '⚙️' }] : []),
  ];
```
With:
```tsx
  const navItems = [
    { label: t('dashboard'), path: '/dashboard', icon: '📊' },
    ...(canScan ? [{ label: t('scanner'), path: '/scanner', icon: '📱' }] : []),
    ...(isAdmin ? [{ label: t('admin'), path: '/admin', icon: '⚙️' }] : []),
  ];
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: hide scanner nav for read-only users"
```

---

## Task 3: Disable Check In / Check Out for installation users in scanner.tsx

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add `disabled` to scanModes type and values**

Replace (around line 211):
```tsx
  const scanModes: { value: ScanAction; label: string; icon: string }[] = [
    { value: 'check_in', label: t('checkIn'), icon: '📥' },
    { value: 'activate', label: t('activate'), icon: '⚡' },
    { value: 'return', label: t('return'), icon: '↩️' },
    { value: 'check_out', label: t('checkOut'), icon: '📤' },
  ];
```
With:
```tsx
  const scanModes: { value: ScanAction; label: string; icon: string; disabled: boolean }[] = [
    { value: 'check_in',  label: t('checkIn'),  icon: '📥', disabled: userRole === 'installation' },
    { value: 'activate',  label: t('activate'), icon: '⚡', disabled: false },
    { value: 'return',    label: t('return'),   icon: '↩️', disabled: false },
    { value: 'check_out', label: t('checkOut'), icon: '📤', disabled: userRole === 'installation' },
  ];
```

- [ ] **Step 2: Add mode-reset effect**

Add a new `useEffect` directly after the existing `useEffect` that resets state on project/mode change (the one with `[selectedProjectId, scanMode]` deps). Insert:

```tsx
  useEffect(() => {
    if (userRole === 'installation' && ['check_in', 'check_out'].includes(scanMode)) {
      setScanMode('activate');
    }
  }, [userRole]);
```

- [ ] **Step 3: Update the scan mode button rendering**

Replace the scan mode button (around line 360):
```tsx
                    <button
                      key={mode.value}
                      onClick={() => setScanMode(mode.value)}
                      className={`px-4 py-3 rounded-lg font-medium transition flex flex-col items-center gap-1 text-sm ${
                        scanMode === mode.value
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-xl">{mode.icon}</span>
                      <span className="text-xs">{mode.label}</span>
                    </button>
```
With:
```tsx
                    <button
                      key={mode.value}
                      onClick={() => !mode.disabled && setScanMode(mode.value)}
                      disabled={mode.disabled}
                      className={`px-4 py-3 rounded-lg font-medium transition flex flex-col items-center gap-1 text-sm ${
                        mode.disabled
                          ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500'
                          : scanMode === mode.value
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-xl">{mode.icon}</span>
                      <span className="text-xs">{mode.label}</span>
                    </button>
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: disable check-in/check-out modes for installation users"
```

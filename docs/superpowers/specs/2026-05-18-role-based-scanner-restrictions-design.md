# Role-Based Scanner Restrictions Design

**Date:** 2026-05-18  
**Status:** Approved

---

## Overview

Two role-based restrictions for the Scanner feature:

1. **Read-only users** — Scanner nav item is hidden if the user's role is `read_only` across every project they are assigned to.
2. **Installation users** — Check In and Check Out scan modes are visible but disabled in the Scanner page when the user's role in the current project is `installation`.

---

## Backend: Extend `/api/auth/user`

**File:** `src/pages/api/auth/user.ts`

Add a `canScan` boolean to the response. It is `true` if the user has at least one `projectUser` record with a role other than `read_only`.

```ts
const [dbUser, adminRole, scanRole] = await Promise.all([
  prisma.user.findUnique({ where: { id: req.userId } }),
  prisma.projectUser.findFirst({ where: { userId: req.userId, role: 'admin' } }),
  prisma.projectUser.findFirst({
    where: { userId: req.userId, role: { not: 'read_only' } },
  }),
]);

res.status(200).json({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.name,
  isAdmin: !!adminRole,
  canScan: !!scanRole,
});
```

**Rule:** A user with no project assignments gets `canScan: false`.

---

## Layout.tsx: Hide Scanner Nav

**File:** `src/components/Layout.tsx`

Add `canScan` state (default `true` to prevent a flash of missing nav on load). Read it from the `/api/auth/user` response alongside `isAdmin`. Include the Scanner nav item conditionally:

```ts
const [isAdmin, setIsAdmin] = useState(false);
const [canScan, setCanScan] = useState(true);

useEffect(() => {
  if (session?.user) {
    axios.get('/api/auth/user')
      .then((res) => {
        setIsAdmin(res.data.isAdmin ?? false);
        setCanScan(res.data.canScan ?? true);
      })
      .catch(() => setIsAdmin(false));
  }
}, [session]);

const navItems = [
  { label: t('dashboard'), path: '/dashboard', icon: '📊' },
  ...(canScan ? [{ label: t('scanner'), path: '/scanner', icon: '📱' }] : []),
  ...(isAdmin ? [{ label: t('admin'), path: '/admin', icon: '⚙️' }] : []),
];
```

Scanner disappears from both the desktop nav and the mobile nav for users who are `read_only` in all their projects.

---

## Scanner.tsx: Disabled Modes for Installation

**File:** `src/pages/scanner.tsx`

Add a `disabled` property to the `scanModes` array. `check_in` and `check_out` are disabled when `userRole === 'installation'`:

```ts
const scanModes: { value: ScanAction; label: string; icon: string; disabled: boolean }[] = [
  { value: 'check_in',  label: t('checkIn'),  icon: '📥', disabled: userRole === 'installation' },
  { value: 'activate',  label: t('activate'), icon: '⚡', disabled: false },
  { value: 'return',    label: t('return'),   icon: '↩️', disabled: false },
  { value: 'check_out', label: t('checkOut'), icon: '📤', disabled: userRole === 'installation' },
];
```

**Disabled button styling** — greyed out and unclickable (consistent with other disabled buttons in the app):

```tsx
<button
  key={mode.value}
  onClick={() => !mode.disabled && setScanMode(mode.value)}
  disabled={mode.disabled}
  className={`... ${
    mode.disabled
      ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500'
      : scanMode === mode.value
        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
  }`}
>
```

**Mode reset:** If the selected `scanMode` is `check_in` or `check_out` when the project changes to one where the user is `installation`, reset to `activate` to avoid being stuck on a disabled mode. This is handled in the `useEffect` that fires on `selectedProjectId` change:

```ts
useEffect(() => {
  if (userRole === 'installation' && ['check_in', 'check_out'].includes(scanMode)) {
    setScanMode('activate');
  }
}, [userRole]);
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/api/auth/user.ts` | Add `scanRole` query + `canScan` field |
| `src/components/Layout.tsx` | Add `canScan` state, conditionally include Scanner nav item |
| `src/pages/scanner.tsx` | Add `disabled` to scanModes, disabled button styling, mode reset effect |

---

## Out of Scope

- Redirecting read-only users who navigate directly to `/scanner` via URL (the scanner page itself handles role-based restrictions; hiding the nav is a UX convenience)
- Disabling scan modes for roles other than `installation`

# Admin Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the Admin section and project creation to users who hold the `admin` role in at least one project; all other authenticated users only see the projects they are assigned to.

**Architecture:** A single `isAdmin` field is added to `GET /api/auth/user`. `Layout.tsx` fetches this on mount to show/hide the Admin nav. Admin pages redirect non-admins to `/dashboard`. `POST /api/projects` rejects callers who have no admin role.

**Tech Stack:** Next.js Pages Router, React hooks, Axios, Prisma

---

## File Map

| File | Change |
|---|---|
| `src/pages/api/auth/user.ts` | Add `isAdmin` to response |
| `src/pages/api/projects.ts` | Restrict POST to admin users |
| `src/components/Layout.tsx` | Fetch isAdmin, hide Admin nav for non-admins |
| `src/pages/admin/index.tsx` | Redirect to /dashboard if not admin |
| `src/pages/admin/projects/[id].tsx` | Redirect to /dashboard if not admin |

---

### Task 1: Add isAdmin to /api/auth/user

**Files:**
- Modify: `src/pages/api/auth/user.ts`

- [ ] **Step 1: Add isAdmin query and return it**

Replace the response block:
```ts
  const dbUser = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.status(200).json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
  });
```

With:
```ts
  const [dbUser, adminRole] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.projectUser.findFirst({
      where: { userId: req.userId, role: 'admin' },
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
  });
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "user.ts" | head -5
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/auth/user.ts
git commit -m "feat: add isAdmin to /api/auth/user response"
```

---

### Task 2: Restrict POST /api/projects to admin users

**Files:**
- Modify: `src/pages/api/projects.ts`

- [ ] **Step 1: Add admin check at the start of handlePost**

Find `handlePost`. After `await withAuth(req, res); if (!req.userId) return;`, add:

```ts
  const adminRole = await prisma.projectUser.findFirst({
    where: { userId: req.userId, role: 'admin' },
  });

  if (!adminRole) {
    return res.status(403).json({ error: 'Only admins can create projects' });
  }
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "projects.ts" | head -5
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/projects.ts
git commit -m "feat: restrict project creation to admin users"
```

---

### Task 3: Hide Admin nav item for non-admins in Layout

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add axios import if not present, add isAdmin state**

At the top of the component, after existing state declarations, add:
```tsx
  const [isAdmin, setIsAdmin] = useState(false);
```

- [ ] **Step 2: Add useEffect to fetch isAdmin when session loads**

Add after the existing state declarations:
```tsx
  useEffect(() => {
    if (session?.user) {
      axios.get('/api/auth/user')
        .then((res) => setIsAdmin(res.data.isAdmin ?? false))
        .catch(() => setIsAdmin(false));
    }
  }, [session]);
```

- [ ] **Step 3: Filter Admin nav item based on isAdmin**

Find the navItems array:
```tsx
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Scanner', path: '/scanner', icon: '📱' },
    { label: 'Admin', path: '/admin', icon: '⚙️' },
  ];
```

Replace with:
```tsx
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Scanner', path: '/scanner', icon: '📱' },
    ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: '⚙️' }] : []),
  ];
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "Layout" | head -5
```
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: hide Admin nav item for non-admin users"
```

---

### Task 4: Redirect non-admins away from admin pages

**Files:**
- Modify: `src/pages/admin/index.tsx`
- Modify: `src/pages/admin/projects/[id].tsx`

- [ ] **Step 1: Add admin redirect to admin/index.tsx**

In `src/pages/admin/index.tsx`, add an import for axios if not present. Then add a new `useEffect` after the existing ones:

```tsx
  useEffect(() => {
    if (status === 'authenticated') {
      axios.get('/api/auth/user')
        .then((res) => {
          if (!res.data.isAdmin) {
            router.push('/dashboard');
          }
        })
        .catch(() => router.push('/dashboard'));
    }
  }, [status, router]);
```

- [ ] **Step 2: Add admin redirect to admin/projects/[id].tsx**

In `src/pages/admin/projects/[id].tsx`, add a new `useEffect` after the existing ones:

```tsx
  useEffect(() => {
    if (session) {
      axios.get('/api/auth/user')
        .then((res) => {
          if (!res.data.isAdmin) {
            router.push('/dashboard');
          }
        })
        .catch(() => router.push('/dashboard'));
    }
  }, [session, router]);
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects" | head -10
```
Expected: no errors

- [ ] **Step 4: Manual smoke test**

1. Log in as a non-admin user assigned to a project
2. Confirm Admin nav item is NOT visible in the header
3. Directly navigate to `/admin` → should redirect to `/dashboard`
4. Directly navigate to `/admin/projects/[id]` → should redirect to `/dashboard`
5. Dashboard project selector still shows the user's assigned projects
6. Log in as admin → Admin nav visible, admin pages accessible, can create projects
7. Non-admin trying `POST /api/projects` → 403

- [ ] **Step 5: Commit and push**

```bash
git add src/pages/admin/index.tsx "src/pages/admin/projects/[id].tsx" docs/superpowers/plans/2026-05-18-admin-access-control.md
git commit -m "feat: redirect non-admins away from admin pages"
git push origin main
```

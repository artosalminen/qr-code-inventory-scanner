# Project Selection Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the selected project ID in localStorage so navigation and page reloads restore the last-used project, falling back to the first active project if the stored one is no longer available.

**Architecture:** A single custom hook `usePersistedProject` replaces the `useState<string>('')` calls in `dashboard.tsx` and `scanner.tsx`. The hook reads localStorage on first project load, validates the stored ID against the active projects list, and writes on every change. A `useRef` flag ensures the auto-selection fires only once (when projects first populates from empty), preventing background refetches from overwriting the user's current selection.

**Tech Stack:** React hooks (`useState`, `useEffect`, `useRef`), browser `localStorage`, TypeScript, Jest + `@testing-library/react` (`renderHook`, `act`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/use-persisted-project.ts` | Hook: read/write localStorage, validate against projects list |
| Create | `__tests__/use-persisted-project.test.ts` | Unit tests for hook behaviour |
| Modify | `src/pages/dashboard.tsx` lines 3, 14, 32–34 | Swap `useState` → hook, remove manual fallback |
| Modify | `src/pages/scanner.tsx` lines 3–8, 42, 109–111 | Swap `useState` → hook, remove manual fallback |

---

## Task 1: Hook — `usePersistedProject`

**Files:**
- Create: `src/lib/use-persisted-project.ts`
- Create: `__tests__/use-persisted-project.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/use-persisted-project.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePersistedProject } from '@/lib/use-persisted-project';
import { Project } from '@/types';

function makeProject(id: string): Project {
  return {
    id,
    name: `Project ${id}`,
    description: null,
    csvUploadedAt: null,
    defaultQrMode: 'check-in',
    status: 'active',
    createdBy: 'user1',
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('usePersistedProject', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty string when projects list is empty', () => {
    const { result } = renderHook(() => usePersistedProject([]));
    expect(result.current[0]).toBe('');
  });

  it('selects first project when localStorage is empty', () => {
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    expect(result.current[0]).toBe('p1');
  });

  it('selects stored project when it exists in the list', () => {
    localStorage.setItem('selectedProjectId', 'p2');
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    expect(result.current[0]).toBe('p2');
  });

  it('falls back to first project when stored id is not in the list', () => {
    localStorage.setItem('selectedProjectId', 'archived-or-deleted-id');
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    expect(result.current[0]).toBe('p1');
  });

  it('persists selection to localStorage on change', () => {
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result } = renderHook(() => usePersistedProject(projects));
    act(() => {
      result.current[1]('p2');
    });
    expect(result.current[0]).toBe('p2');
    expect(localStorage.getItem('selectedProjectId')).toBe('p2');
  });

  it('does not reset selection when projects list re-renders with a new array reference', () => {
    const projects = [makeProject('p1'), makeProject('p2')];
    const { result, rerender } = renderHook(
      ({ ps }: { ps: Project[] }) => usePersistedProject(ps),
      { initialProps: { ps: projects } },
    );
    act(() => { result.current[1]('p2'); });
    rerender({ ps: [...projects] });
    expect(result.current[0]).toBe('p2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx jest __tests__/use-persisted-project.test.ts --no-coverage
```

Expected: 6 failures — `Cannot find module '@/lib/use-persisted-project'`

- [ ] **Step 3: Implement the hook**

Create `src/lib/use-persisted-project.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { Project } from '@/types';

const STORAGE_KEY = 'selectedProjectId';

export function usePersistedProject(projects: Project[]): [string, (id: string) => void] {
  const [selectedId, setSelectedId] = useState<string>('');
  const initialized = useRef(false);

  useEffect(() => {
    if (projects.length === 0 || initialized.current) return;
    initialized.current = true;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored !== null && projects.some((p) => p.id === stored);
    setSelectedId(valid ? stored : projects[0].id);
  }, [projects]);

  function persist(id: string) {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  return [selectedId, persist];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx jest __tests__/use-persisted-project.test.ts --no-coverage
```

Expected: 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-persisted-project.ts __tests__/use-persisted-project.test.ts
git commit -m "feat: add usePersistedProject hook for localStorage-backed project selection"
```

---

## Task 2: Integrate hook into `dashboard.tsx`

**Files:**
- Modify: `src/pages/dashboard.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/dashboard.tsx`, change line 3 from:

```typescript
import { useEffect, useState } from 'react';
```

to:

```typescript
import { useEffect, useState } from 'react';
import { usePersistedProject } from '@/lib/use-persisted-project';
```

(Insert the new import on line 4, after the react import.)

- [ ] **Step 2: Replace the selectedProjectId state declaration**

Change line 14 from:

```typescript
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
```

to:

```typescript
  const [selectedProjectId, setSelectedProjectId] = usePersistedProject(projects);
```

- [ ] **Step 3: Remove the manual fallback inside fetchProjects**

Change lines 32–34 in `fetchProjects` from:

```typescript
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
```

to:

```typescript
      setProjects(data);
```

- [ ] **Step 4: Run the full test suite to verify no regressions**

```
npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard.tsx
git commit -m "feat: persist selected project in dashboard via usePersistedProject"
```

---

## Task 3: Integrate hook into `scanner.tsx`

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/scanner.tsx`, change lines 3–8 from:

```typescript
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import QRScanner from '@/components/QRScanner';
import { BoxState, Project, ScanAction } from '@/types';
import { useTranslations } from 'next-intl';
```

to:

```typescript
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import QRScanner from '@/components/QRScanner';
import { BoxState, Project, ScanAction } from '@/types';
import { useTranslations } from 'next-intl';
import { usePersistedProject } from '@/lib/use-persisted-project';
```

- [ ] **Step 2: Replace the selectedProjectId state declaration**

Change line 42 from:

```typescript
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
```

to:

```typescript
  const [selectedProjectId, setSelectedProjectId] = usePersistedProject(projects);
```

- [ ] **Step 3: Remove the manual fallback inside fetchProjects**

Change lines 108–111 in `fetchProjects` from:

```typescript
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
```

to:

```typescript
      const { data } = await axios.get('/api/projects');
      setProjects(data);
```

- [ ] **Step 4: Run the full test suite to verify no regressions**

```
npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: persist selected project in scanner via usePersistedProject"
```

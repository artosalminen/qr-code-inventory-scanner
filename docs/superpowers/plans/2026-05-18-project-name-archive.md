# Project Name Editing & Archive Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to rename a project and toggle its archived state from the project management page.

**Architecture:** Extend the existing `PUT /api/projects/[id]` endpoint to accept an optional `status` field, then add a "Project Settings" card to the project detail page with a name input and an archive/unarchive action. The admin project list gets an archived badge. Dashboard and scanner already exclude archived projects via the `GET /api/projects` default filter.

**Tech Stack:** Next.js, React, TypeScript, Prisma (Azure SQL), next-intl for i18n

---

## File Map

| File | Change |
|------|--------|
| `src/pages/api/projects/[id].ts` | Extend PUT to accept `status`, set/clear `archivedAt` |
| `src/pages/admin/projects/[id].tsx` | Add Project Settings card (name edit + archive toggle) |
| `src/pages/admin/index.tsx` | Show archived badge + timestamp on project cards; fetch all statuses |
| `messages/en.json` | Add new translation keys under `admin` |
| `messages/fi.json` | Add Finnish translations for the same keys |

---

## Task 1: Extend PUT endpoint to handle `status`

**Files:**
- Modify: `src/pages/api/projects/[id].ts`

- [ ] **Step 1: Update `handlePut` to accept `status` and do a partial update**

Replace the entire `handlePut` function with:

```typescript
async function handlePut(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  await withProjectRole(req, res, id, ['admin']);

  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { name, description, status } = req.body;

    if (name !== undefined && !name) {
      return res.status(400).json({ error: 'Project name cannot be empty' });
    }

    if (status !== undefined && status !== 'active' && status !== 'archived') {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (status !== undefined) {
      data.status = status;
      data.archivedAt = status === 'archived' ? new Date() : null;
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        projectUsers: {
          include: { user: true },
        },
      },
    });

    res.status(200).json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd C:\repos\slmnn\qr-code-inventory && npx tsc --noEmit
```

Expected: no errors related to `[id].ts`

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/projects/[id].ts
git commit -m "feat: extend PUT /api/projects/[id] to support status/archive toggle"
```

---

## Task 2: Add translation keys (EN + FI)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/fi.json`

- [ ] **Step 1: Add keys to `messages/en.json`**

Inside the `"admin"` object, after `"roleAdminDisplay": "admin"`, add a comma and these entries:

```json
"projectSettings": "⚙️ Project Settings",
"projectName": "Project Name",
"saveProjectName": "Save Name",
"archiveProject": "Archive Project",
"archiveConfirmMessage": "This will hide the project from the dashboard and scanner. You can unarchive it later.",
"confirmArchive": "Confirm Archive",
"unarchiveProject": "Unarchive",
"archivedBadge": "Archived",
"archivedAt": "Archived",
"saveNameFailed": "Failed to save project name",
"archiveFailed": "Failed to update project status"
```

- [ ] **Step 2: Add keys to `messages/fi.json`**

Add the same keys inside the `"admin"` object in `messages/fi.json`:

```json
"projectSettings": "⚙️ Projektin asetukset",
"projectName": "Projektin nimi",
"saveProjectName": "Tallenna nimi",
"archiveProject": "Arkistoi projekti",
"archiveConfirmMessage": "Tämä piilottaa projektin kojelaudalta ja skannerista. Voit palauttaa sen myöhemmin.",
"confirmArchive": "Vahvista arkistointi",
"unarchiveProject": "Palauta arkistosta",
"archivedBadge": "Arkistoitu",
"archivedAt": "Arkistoitu",
"saveNameFailed": "Nimen tallennus epäonnistui",
"archiveFailed": "Projektin tilan päivitys epäonnistui"
```

- [ ] **Step 3: Verify dev server starts without i18n errors**

```bash
npm run dev
```

Expected: server starts, no missing-key warnings for the new keys

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/fi.json
git commit -m "feat: add i18n keys for project settings and archive toggle"
```

---

## Task 3: Add Project Settings card to project detail page

**Files:**
- Modify: `src/pages/admin/projects/[id].tsx`

- [ ] **Step 1: Add state variables for name editing and archive confirmation**

In the state declarations block (after the existing `const [savingLabel, ...]` declarations), add:

```typescript
const [editingName, setEditingName] = useState('');
const [savingName, setSavingName] = useState(false);
const [nameError, setNameError] = useState('');
const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
const [archiving, setArchiving] = useState(false);
const [archiveError, setArchiveError] = useState('');
```

- [ ] **Step 2: Initialise `editingName` when project loads**

In the `fetchProjectData` function, after `setProject(projectRes.data)`, add:

```typescript
setEditingName(projectRes.data.name);
```

- [ ] **Step 3: Add `saveProjectName` function**

After the `saveLabel` function, add:

```typescript
async function saveProjectName() {
  if (!id || savingName || !editingName.trim()) return;
  setSavingName(true);
  setNameError('');
  try {
    await axios.put(`/api/projects/${id}`, { name: editingName.trim() });
    fetchProjectData();
  } catch (error: any) {
    setNameError(error.response?.data?.error || t('saveNameFailed'));
  } finally {
    setSavingName(false);
  }
}
```

- [ ] **Step 4: Add `toggleArchive` function**

After `saveProjectName`, add:

```typescript
async function toggleArchive(newStatus: 'active' | 'archived') {
  if (!id || archiving) return;
  setArchiving(true);
  setArchiveError('');
  try {
    await axios.put(`/api/projects/${id}`, { status: newStatus });
    setShowArchiveConfirm(false);
    fetchProjectData();
  } catch (error: any) {
    setArchiveError(error.response?.data?.error || t('archiveFailed'));
  } finally {
    setArchiving(false);
  }
}
```

- [ ] **Step 5: Add the Project Settings card to the JSX**

In the JSX `return`, after the back-button/title `<div>` (the one ending at `<p className="text-slate-400 mt-2">...`) and before the `{canManageBoxes && ...}` block, insert this block (admin-only):

```tsx
{isAdmin && (
  <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-50">{t('projectSettings')}</h2>

      {/* Name editing */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">{t('projectName')}</label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveProjectName(); }}
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={saveProjectName}
            disabled={savingName || !editingName.trim() || editingName.trim() === project.name}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
          >
            {savingName ? tCommon('saving') : t('saveProjectName')}
          </button>
        </div>
        {nameError && <p className="text-sm text-red-400">{nameError}</p>}
      </div>

      {/* Archive toggle */}
      <div className="pt-4 border-t border-slate-700 space-y-3">
        {project.status === 'archived' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900 text-amber-300 border border-amber-700">
                {t('archivedBadge')}
              </span>
              {project.archivedAt && (
                <span className="text-sm text-slate-400">
                  {t('archivedAt')} {new Date(project.archivedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={() => toggleArchive('active')}
              disabled={archiving}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {archiving ? tCommon('updating') : t('unarchiveProject')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!showArchiveConfirm ? (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="w-full sm:w-auto px-6 py-3 bg-slate-700 hover:bg-amber-900 border border-slate-600 hover:border-amber-700 text-slate-300 hover:text-amber-300 rounded-lg font-medium transition"
              >
                {t('archiveProject')}
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-amber-950 border border-amber-800 rounded-lg">
                <p className="text-sm text-amber-200">{t('archiveConfirmMessage')}</p>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <button
                    onClick={() => toggleArchive('archived')}
                    disabled={archiving}
                    className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium transition"
                  >
                    {archiving ? tCommon('updating') : t('confirmArchive')}
                  </button>
                  <button
                    onClick={() => setShowArchiveConfirm(false)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                  >
                    {tCommon('cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {archiveError && <p className="text-sm text-red-400">{archiveError}</p>}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify the file compiles**

```bash
cd C:\repos\slmnn\qr-code-inventory && npx tsc --noEmit
```

Expected: no TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/projects/[id].tsx
git commit -m "feat: add project settings card with name editing and archive toggle"
```

---

## Task 4: Show archived badge on admin project list

**Files:**
- Modify: `src/pages/admin/index.tsx`

- [ ] **Step 1: Fetch all projects (active + archived) on the admin list**

In `fetchProjects`, change:

```typescript
const { data } = await axios.get('/api/projects');
```

to:

```typescript
const { data } = await axios.get('/api/projects?status=all');
```

The existing API at `src/pages/api/projects.ts` line 19 reads `req.query.status || 'active'` and passes it directly to Prisma. Passing `status=all` will fail the Prisma enum validation. We need to handle `"all"` in the API first.

Open `src/pages/api/projects.ts` and update the status filter in `handleGet`:

Find:
```typescript
const status = req.query.status || 'active';
```

and the `where` clause that uses it. Replace the relevant filter block so that when `status === 'all'` no status filter is applied:

```typescript
const status = req.query.status || 'active';
const whereStatus = status === 'all' ? {} : { status: typeof status === 'string' ? status : status[0] };
```

Then in the Prisma query, replace `status: typeof status === 'string' ? status : status[0]` with `...whereStatus`.

The full updated `handleGet` in `src/pages/api/projects.ts`:

```typescript
async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  await withAuth(req, res);
  if (!req.userId) return;

  const status = req.query.status || 'active';
  const whereStatus = status === 'all' ? {} : { status: typeof status === 'string' ? status : status[0] };

  try {
    const projects = await prisma.project.findMany({
      where: {
        projectUsers: {
          some: { userId: req.userId },
        },
        ...whereStatus,
      },
      include: {
        projectUsers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

- [ ] **Step 2: Add archived badge to project cards in `src/pages/admin/index.tsx`**

In the project card JSX, find the project name heading:

```tsx
<h3 className="text-lg font-bold text-slate-50 group-hover:text-blue-400 transition">
  {project.name}
</h3>
```

Replace with:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <h3 className="text-lg font-bold text-slate-50 group-hover:text-blue-400 transition">
    {project.name}
  </h3>
  {project.status === 'archived' && (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900 text-amber-300 border border-amber-700">
      {t('archivedBadge')}
    </span>
  )}
</div>
{project.status === 'archived' && project.archivedAt && (
  <p className="text-xs text-slate-500 mt-1">
    {t('archivedAt')} {new Date(project.archivedAt).toLocaleDateString()}
  </p>
)}
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd C:\repos\slmnn\qr-code-inventory && npx tsc --noEmit
```

Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/index.tsx src/pages/api/projects.ts
git commit -m "feat: show archived projects in admin list with badge and timestamp"
```

---

## Task 5: Manual smoke test

- [ ] Run the dev server: `npm run dev`
- [ ] Open `http://localhost:3000/admin/projects/<any-project-id>` as an admin
- [ ] Verify the "Project Settings" card appears at the top with the current name pre-filled
- [ ] Edit the name and save — confirm the `<h1>` title updates
- [ ] Click "Archive Project" → confirm the amber confirmation box appears
- [ ] Click "Confirm Archive" → confirm the card shows the "Archived" badge + date and "Unarchive" button
- [ ] Click "Unarchive" → confirm the card returns to the archive button
- [ ] Open `http://localhost:3000/admin` — confirm archived project shows the "Archived" badge and date
- [ ] Open `http://localhost:3000/dashboard` or `/scanner` — confirm the archived project is NOT listed in the project dropdown

# Scan History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the last 5 scanned boxes on the Scanner page with their resulting state and elapsed time.

**Architecture:** Pure client-side state — a `ScanHistoryEntry[]` array capped at 5 entries, newest first. Populated by both `handleScan` and `handleAddBox` on success. Rendered as a card below the main scanner card. No API changes.

**Tech Stack:** React useState, Tailwind CSS, TypeScript

---

## File Map

| File | Change |
|---|---|
| `src/pages/scanner.tsx` | Add type, state, helper, update two functions, add render block |

---

### Task 1: Add scan history — state, logic, and UI

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add BoxState to the import**

Change line 7:
```tsx
import { Project, ScanAction } from '@/types';
```
to:
```tsx
import { BoxState, Project, ScanAction } from '@/types';
```

- [ ] **Step 2: Add ScanHistoryEntry type and timeAgo helper above the component**

Add after the import block, before `export default function ScannerPage()`:
```tsx
interface ScanHistoryEntry {
  label: string;
  qrCode: string;
  newState: BoxState;
  timestamp: Date;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const stateBadgeColors: Record<BoxState, string> = {
  received: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  in_use: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  ready_for_checkout: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  departed: 'bg-green-900/50 text-green-300 border border-green-700',
};

const stateLabels: Record<BoxState, string> = {
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready',
  departed: 'Departed',
};
```

- [ ] **Step 3: Add scanHistory state after isAddingBox**

```tsx
const [isAddingBox, setIsAddingBox] = useState(false);
const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
```

- [ ] **Step 4: Push to scanHistory in handleScan on success**

After `setScannerOpen(false);` inside the try block of `handleScan`, add:
```tsx
setScanHistory((prev) =>
  [
    {
      label: data.box.label || data.box.qrCode,
      qrCode: data.box.qrCode,
      newState: data.newState as BoxState,
      timestamp: new Date(),
    },
    ...prev,
  ].slice(0, 5),
);
```

- [ ] **Step 5: Push to scanHistory in handleAddBox on success**

After `setScannerOpen(false);` inside the try block of `handleAddBox`, add:
```tsx
setScanHistory((prev) =>
  [
    {
      label: addBoxLabel.trim() || addBoxQr.trim(),
      qrCode: addBoxQr.trim(),
      newState: 'received' as BoxState,
      timestamp: new Date(),
    },
    ...prev,
  ].slice(0, 5),
);
```

- [ ] **Step 6: Add the scan history card after the closing `</div>` of the main scanner card**

Add after `</div>` that closes `{/* Main Scanner Card */}`, before the closing `</div>` of the outer `space-y-6` div:
```tsx
{/* Scan History */}
{scanHistory.length > 0 && (
  <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-700">
      <h2 className="font-semibold text-slate-200 text-sm">Recent Scans</h2>
    </div>
    <div className="divide-y divide-slate-700">
      {scanHistory.map((entry, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
          <div className="min-w-0">
            <div className="font-medium text-slate-50 text-sm truncate">{entry.label}</div>
            <div className="text-xs text-slate-500 truncate">{entry.qrCode}</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${stateBadgeColors[entry.newState]}`}>
              {stateLabels[entry.newState]}
            </span>
            <span className="text-xs text-slate-500 w-16 text-right">{timeAgo(entry.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 7: Check for TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep scanner
```
Expected: no output (no errors in scanner.tsx)

- [ ] **Step 8: Manual smoke test**

1. Go to `/scanner`
2. Perform 2–3 scans in any mode
3. Confirm a "Recent Scans" card appears below the scanner card
4. Each row shows box label, state badge with correct colour, and elapsed time
5. After 6 scans the oldest entry disappears (only 5 shown)
6. Refreshing the page clears the list

- [ ] **Step 9: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: show last 5 scanned boxes on scanner page"
```

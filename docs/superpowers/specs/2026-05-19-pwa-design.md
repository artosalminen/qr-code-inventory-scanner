# PWA Design: Installability + Offline Scan Queue

**Date:** 2026-05-19  
**Status:** Approved

## Goals

- Workers can install the app to their home screen (no browser chrome)
- Workers can scan boxes while offline; scans sync automatically on reconnect
- No offline state display — workers do not see box states while offline
- Conflict resolution: first-in-wins (server validates state transitions; 409 on conflict)

## Out of Scope

- Caching box/project state for offline viewing
- Background sync when app is closed (not cross-platform; iOS Safari unsupported)
- Push notifications

## Architecture

Five pieces, no new npm dependencies:

| Piece | Location | Purpose |
|---|---|---|
| Web App Manifest | `public/manifest.json` | Installability metadata |
| PWA Icons | `public/icons/icon-192.png`, `icon-512.png` | Required for install prompt |
| Service Worker | `public/sw.js` | Browser installability requirement; minimal network-first caching |
| Scan Queue | `src/lib/scan-queue.ts` | IndexedDB-backed queue for offline scans |
| Scanner Integration | `src/pages/scanner.tsx` | Forks on `navigator.onLine`; offline banner + queue count |

Supporting hooks:
- `src/hooks/useOnlineStatus.ts` — `useState` + `online`/`offline` event listeners
- `src/hooks/useQueueFlush.ts` — flushes IndexedDB queue on `online` event and app mount

`_app.tsx` registers the service worker and calls `useQueueFlush`.

## Data Flow

**Online (unchanged):**
```
scan QR → POST /api/boxes/scan → success → update UI
```

**Offline:**
```
scan QR → navigator.onLine === false → enqueue() to IndexedDB → "Scan queued" toast
```

**Reconnect:**
```
online event fires
  → getAll() from IndexedDB (ordered by timestamp, oldest first)
  → POST each scan sequentially
      success → remove(id)
      409/error → remove(id), collect failure detail
  → toast: "N scans synced" or "N synced, M failed: [box labels]"
```

Sequential processing preserves first-in-wins: if two queued scans target the same box, the first POST succeeds and the second receives a 409 from the server's state machine.

The flush also runs on app mount to catch scans queued in a previous session.

## Web App Manifest

`public/manifest.json`:
```json
{
  "name": "QR Code Inventory",
  "short_name": "Inventory",
  "description": "QR code-based equipment tracking and handoff",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Linked via `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color" content="#2563eb">` in `_app.tsx` using `next/head`.

Icons are generated once using `sharp` (already in `package.json`) via a one-off script (`scripts/generate-icons.ts`). The script creates a simple solid blue (#2563eb) square PNG at 192×192 and 512×512. Outputs are committed to the repo — no runtime generation. (The existing SVGs in `public/` are Next.js/Vercel placeholders and are not used.)

## Service Worker

`public/sw.js`:
```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) return; // network-only for API
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
```

Strategy: network-first with silent cache fallback for non-API assets. This keeps already-loaded page assets (JS chunks, CSS) available if connectivity drops mid-session. API routes are excluded — stale state must never be served.

Registration in `_app.tsx` (silent, no user-visible error if SW registration fails):
```ts
useEffect(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
}, []);
```

## Offline Scan Queue

`src/lib/scan-queue.ts` wraps IndexedDB with three operations:

```ts
interface QueuedScan {
  id: string;       // crypto.randomUUID()
  qrCode: string;
  projectId: string;
  timestamp: number;
}

enqueue(scan: QueuedScan): Promise<void>
getAll(): Promise<QueuedScan[]>   // ordered by timestamp ASC
remove(id: string): Promise<void>
```

IndexedDB store name: `pending_scans`, keyPath: `id`. Created in `onupgradeneeded`.

## Scanner Integration

`src/pages/scanner.tsx` changes:

**Scan handler fork:**
```ts
if (!navigator.onLine) {
  await enqueue({ id: crypto.randomUUID(), qrCode, projectId, timestamp: Date.now() });
  showToast('Scan queued — will sync when back online');
  return;
}
// existing POST /api/boxes/scan logic unchanged
```

**Offline banner:** persistent strip at top of scanner when offline.
- Text: "You're offline — scans are being queued (N pending)"
- Driven by `useOnlineStatus` hook
- Disappears automatically when connectivity returns

**No API changes** — `/api/boxes/scan` already returns 409 for invalid state transitions.

## Files Changed

| File | Change |
|---|---|
| `public/manifest.json` | New |
| `public/sw.js` | New |
| `public/icons/icon-192.png` | New (generated) |
| `public/icons/icon-512.png` | New (generated) |
| `scripts/generate-icons.ts` | New (build-time icon generation) |
| `src/lib/scan-queue.ts` | New |
| `src/hooks/useOnlineStatus.ts` | New |
| `src/hooks/useQueueFlush.ts` | New |
| `src/pages/_app.tsx` | Modify: SW registration, manifest link, theme-color meta, useQueueFlush |
| `src/pages/scanner.tsx` | Modify: offline fork in scan handler, offline banner |

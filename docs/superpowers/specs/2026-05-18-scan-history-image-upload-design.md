# Scan History Image Upload — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

## Overview

Add the ability to attach up to 3 photos to a scan history entry (`BoxStateHistory`). Photos are taken or selected during the scan confirmation flow (alongside notes/condition), uploaded to Vercel Blob private storage, and displayed as thumbnails in the Dashboard history list.

## Flow & UX

Images are attached in the same confirmation screen where the user enters notes and condition — no separate step visible to the user.

**Scan confirmation screen (scanner.tsx):**
1. Below the notes field, a row of up to 3 image slots is shown.
2. Empty slots show a camera/`+` icon tap target. Filled slots show a thumbnail with an `×` remove button.
3. Tapping a slot opens `<input type="file" accept="image/*" capture="environment">` — triggers camera or file picker.
4. Local `URL.createObjectURL` previews are shown immediately (no upload yet).

**On confirm:**
1. Scan POST fires first → `BoxStateHistory` entry created → `historyId` returned.
2. If photos were selected: each uploads sequentially to Vercel Blob via `POST /api/images/upload`.
3. A single `PATCH /api/boxes/history/[id]/images` attaches all URLs to the entry.
4. Progress indicator shown during upload ("Uploading photos 1/2…").
5. If upload fails: scan is already saved — show a non-blocking warning: "Scan saved. Photo upload failed — try again from history."

All scan actions (check-in, activate, return, check-out) support image upload.  
Maximum: 3 images per history entry.

## Data Model

### Prisma schema change

Add one field to `BoxStateHistory`:

```prisma
imageUrls  String[]  @default([])  @map("image_urls")
```

### Blob path structure

```
projects/{projectId}/boxes/{boxId}/history/{historyId}/{filename}         ← original
projects/{projectId}/boxes/{boxId}/history/{historyId}/thumb_{filename}   ← thumbnail
```

Only the **original pathname** is stored in `imageUrls`. The thumbnail pathname is derived by convention (`thumb_` prefix on the filename segment) — no extra DB field needed.

### TypeScript type update

```typescript
export interface BoxStateHistory {
  // ...existing fields...
  imageUrls: string[]  // Vercel Blob original pathnames
}
```

## API Routes

All routes require an authenticated session. All use the existing pages router (`pages/api/`).

### `POST /api/images/upload?filename=...`

- Accepts raw file body (server upload, ≤4.5 MB limit).
- Uses **Sharp** to resize to a thumbnail (400px wide, JPEG 80% quality) and uploads both versions to Vercel Blob (`put` with `access: 'private'`).
- Returns `{ pathname: string }` (original pathname).
- Auth: valid session required.

### `PATCH /api/boxes/history/[id]/images`

- Body: `{ imageUrls: string[] }` — list of pathnames to append.
- Validates total after append does not exceed 3.
- Looks up the history entry → its box → project, then checks the caller has project membership.
- Appends pathnames to `BoxStateHistory.imageUrls`.
- Returns updated `imageUrls`.

### `GET /api/images/view?pathname=...&size=thumb|full`

- `size=thumb` (default): prepends `thumb_` to the filename segment of the pathname.
- `size=full`: uses the pathname as-is.
- Fetches the private blob via `get()` from `@vercel/blob` and streams the response.
- Auth check: derive the original pathname (strip `thumb_` from filename segment if present), then query `BoxStateHistory` where `imageUrls` contains that pathname → its box → project → verify caller has project membership.
- Returns the image stream with correct `Content-Type` and `X-Content-Type-Options: nosniff`.

## Dashboard UI

`GET /api/boxes/[id]` already returns full history — it just needs to include `imageUrls` in the Prisma select/return.

**History entry rendering (Dashboard.tsx):**
- Entries with `imageUrls.length > 0` render a row of small thumbnails below the notes/condition text.
- Each thumbnail loads from `/api/images/view?pathname=...&size=thumb`.
- Clicking a thumbnail opens a simple lightbox (full-size via `size=full`, close button).
- Dashboard is view-only — no upload from here.

## Dependencies

```
@vercel/blob   (already installed)
sharp
@types/sharp
```

Environment variable required: `BLOB_READ_WRITE_TOKEN` (pulled via `vercel env pull`).

## Error Handling

| Scenario | Behaviour |
|---|---|
| Scan succeeds, upload fails | Non-blocking warning in scanner UI; scan entry saved without images |
| File > 4.5 MB | Upload route returns 413; UI shows "File too large" |
| Blob not found in view route | Return 404 |
| Caller lacks project access in view route | Return 403 |
| PATCH would exceed 3 images | Return 400 |

## Out of Scope

- Deleting individual images after upload (post-MVP).
- Re-attaching images to an entry from the Dashboard (post-MVP).
- Client-side upload (not needed; files from phone camera are typically under 4.5 MB in practice, and Sharp compression further reduces size).

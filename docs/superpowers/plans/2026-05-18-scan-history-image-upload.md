# Scan History Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to attach up to 3 photos to a scan history entry at confirm-time; photos are stored as private Vercel Blobs with Sharp-generated thumbnails, and displayed in the Dashboard box history view.

**Architecture:** Scan POSTs first and returns `historyId`; images are then uploaded to `POST /api/images/upload` (which also creates a Sharp thumbnail) and PATCHed onto the history entry via `PATCH /api/boxes/history/[id]/images`. Private blobs are served through `GET /api/images/view` which checks project membership before proxying the blob.

**Tech Stack:** `@vercel/blob` (already installed), `sharp`, Next.js pages router, Prisma (PostgreSQL), Jest

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `prisma/schema.prisma` | Add `imageUrls String[]` to `BoxStateHistory` |
| Auto-create | `prisma/migrations/…` | DB migration (Prisma auto-generates) |
| Modify | `src/types/index.ts` | Add `imageUrls: string[]` to `BoxStateHistory`; add `historyId?: string` to `ScanResponse` |
| Modify | `src/pages/api/boxes/scan.ts` | Return `historyId` in scan response |
| Create | `src/pages/api/images/upload.ts` | POST: receive file, Sharp-thumbnail, upload both to Vercel Blob |
| Create | `src/pages/api/boxes/history/[id]/images.ts` | PATCH: set `imageUrls` on a history entry (auth + 3-image limit) |
| Create | `src/pages/api/images/view.ts` | GET: verify project membership, proxy private blob (thumb or full) |
| Modify | `src/pages/scanner.tsx` | Image picker slots, post-scan upload, failure warning |
| Modify | `src/components/Dashboard.tsx` | Thumbnail strip + lightbox in history entries |
| Modify | `messages/en.json` + `messages/fi.json` | i18n keys for new scanner labels |
| Create | `src/__tests__/api/images/upload.test.ts` | Unit tests for upload route |
| Create | `src/__tests__/api/boxes/history/images.test.ts` | Unit tests for PATCH route |
| Create | `src/__tests__/api/images/view.test.ts` | Unit tests for view route |

---

## Task 1: Install Sharp

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install sharp to production dependencies, @types/sharp to dev**

```bash
npm install sharp
npm install --save-dev @types/sharp
```

- [ ] **Step 2: Verify Sharp loads**

```bash
node -e "require('sharp'); console.log('sharp OK')"
```

Expected output: `sharp OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add sharp for server-side image thumbnailing"
```

---

## Task 2: Schema migration + types + scan historyId

**Files:**
- Modify: `prisma/schema.prisma` (lines 128–130, after the `notes` field)
- Modify: `src/types/index.ts` (lines 59–70 and 96–102)
- Modify: `src/pages/api/boxes/scan.ts` (lines 133–139)

- [ ] **Step 1: Add imageUrls field to BoxStateHistory in prisma/schema.prisma**

In `prisma/schema.prisma`, inside the `BoxStateHistory` model, add after the `notes` field and before `createdAt`:

```prisma
  notes             String?

  imageUrls         String[] @default([]) @map("image_urls")

  createdAt         DateTime @default(now()) @map("created_at")
```

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name add_image_urls_to_box_state_history
```

Expected: `The following migration(s) have been created and applied from new schema changes:`

- [ ] **Step 3: Add imageUrls to BoxStateHistory type in src/types/index.ts**

Replace the `BoxStateHistory` interface:

```typescript
export interface BoxStateHistory {
  id: string;
  boxId: string;
  state: BoxState;
  stateSetBy: string;
  changeType: ChangeType;
  condition: string | null;
  notes: string | null;
  brokenItems: string | null;
  installationUser: string | null;
  createdAt: Date;
}
```

With:

```typescript
export interface BoxStateHistory {
  id: string;
  boxId: string;
  state: BoxState;
  stateSetBy: string;
  changeType: ChangeType;
  condition: string | null;
  notes: string | null;
  brokenItems: string | null;
  installationUser: string | null;
  imageUrls: string[];
  createdAt: Date;
}
```

- [ ] **Step 4: Add historyId to ScanResponse in src/types/index.ts**

Replace the `ScanResponse` interface:

```typescript
export interface ScanResponse {
  success: boolean;
  box: Box | null;
  newState: BoxState | null;
  message: string;
  timestamp: Date;
}
```

With:

```typescript
export interface ScanResponse {
  success: boolean;
  box: Box | null;
  newState: BoxState | null;
  message: string;
  timestamp: Date;
  historyId?: string;
}
```

- [ ] **Step 5: Return historyId from scan.ts**

In `src/pages/api/boxes/scan.ts`, replace the final `res.status(200).json(...)` call:

```typescript
    return res.status(200).json({
      success: true,
      box: result.box,
      newState: result.stateHistory.state,
      timestamp: result.stateHistory.createdAt,
    });
```

With:

```typescript
    return res.status(200).json({
      success: true,
      box: result.box,
      newState: result.stateHistory.state,
      historyId: result.stateHistory.id,
      timestamp: result.stateHistory.createdAt,
    });
```

- [ ] **Step 6: Verify TypeScript**

```bash
npm run build
```

Expected: build completes with no type errors

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/types/index.ts src/pages/api/boxes/scan.ts
git commit -m "feat: add imageUrls to BoxStateHistory and return historyId from scan"
```

---

## Task 3: Upload API route

**Files:**
- Create: `src/__tests__/api/images/upload.test.ts`
- Create: `src/pages/api/images/upload.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/images/upload.test.ts`:

```typescript
import handler from '@/pages/api/images/upload';
import { put } from '@vercel/blob';

jest.mock('@vercel/blob', () => ({ put: jest.fn() }));
jest.mock('sharp', () => {
  const chain = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumb-data')),
  };
  return jest.fn(() => chain);
});
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

async function* yieldBuffer(buf: Buffer) { yield buf; }

function makeReq(overrides: Partial<any> = {}) {
  const req: any = {
    method: 'POST',
    query: { filename: 'photo.jpg', historyId: 'hist-1', projectId: 'proj-1', boxId: 'box-1' },
  };
  req[Symbol.asyncIterator] = yieldBuffer.bind(null, Buffer.from('image-data'));
  if (overrides.query) req.query = { ...req.query, ...overrides.query };
  if ('method' in overrides) req.method = overrides.method;
  return req;
}

function makeRes() {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
  return res;
}

describe('POST /api/images/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-POST', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when filename is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ query: { historyId: 'h', projectId: 'p', boxId: 'b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when historyId is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ query: { filename: 'x.jpg', projectId: 'p', boxId: 'b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('uploads original and thumbnail and returns blob url', async () => {
    (put as jest.Mock)
      .mockResolvedValueOnce({ url: 'https://blob.vercel.com/orig.jpg', pathname: 'projects/proj-1/boxes/box-1/history/hist-1/photo.jpg' })
      .mockResolvedValueOnce({ url: 'https://blob.vercel.com/thumb.jpg', pathname: 'projects/proj-1/boxes/box-1/history/hist-1/thumb_photo.jpg' });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(put).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://blob.vercel.com/orig.jpg' }),
    );
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest src/__tests__/api/images/upload.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/pages/api/images/upload'`

- [ ] **Step 3: Create the upload route**

Create `src/pages/api/images/upload.ts`:

```typescript
import { NextApiResponse } from 'next';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const config = {
  api: { bodyParser: false },
};

async function readBody(req: AuthenticatedRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function mimeFromFilename(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return types[ext] ?? 'image/jpeg';
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { filename, historyId, projectId, boxId } = req.query as Record<string, string>;
  if (!filename || !historyId || !projectId || !boxId) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const buffer = await readBody(req);
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const basePath = `projects/${projectId}/boxes/${boxId}/history/${historyId}`;
    const contentType = mimeFromFilename(safeName);

    const thumbBuffer = await sharp(buffer)
      .resize({ width: 400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const [original] = await Promise.all([
      put(`${basePath}/${safeName}`, buffer, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
      }),
      put(`${basePath}/thumb_${safeName}`, thumbBuffer, {
        access: 'private',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
      }),
    ]);

    return res.status(200).json({ url: original.url, pathname: original.pathname });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/__tests__/api/images/upload.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/images/upload.ts src/__tests__/api/images/upload.test.ts
git commit -m "feat: add POST /api/images/upload with Sharp thumbnailing"
```

---

## Task 4: History images PATCH route

**Files:**
- Create: `src/__tests__/api/boxes/history/images.test.ts`
- Create: `src/pages/api/boxes/history/[id]/images.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/boxes/history/images.test.ts`:

```typescript
import handler from '@/pages/api/boxes/history/[id]/images';
import prisma from '@/lib/db';

jest.mock('@/lib/db', () => ({
  boxStateHistory: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

function makeReq(overrides: Partial<any> = {}) {
  return {
    method: 'PATCH',
    query: { id: 'hist-1' },
    body: { imageUrls: ['https://blob.vercel.com/photo.jpg'] },
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    headersSent: false,
  };
  return res;
}

describe('PATCH /api/boxes/history/[id]/images', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-PATCH', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET' }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 404 if history entry not found', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 if user has no project access', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      id: 'hist-1',
      imageUrls: [],
      box: { project: { projectUsers: [] } },
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 if imageUrls list has more than 3 items', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      id: 'hist-1',
      imageUrls: [],
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    const res = makeRes();
    await handler(
      makeReq({ body: { imageUrls: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'] } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Maximum 3 images per entry' });
  });

  it('sets imageUrls and returns 200', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      id: 'hist-1',
      imageUrls: [],
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    (prisma.boxStateHistory.update as jest.Mock).mockResolvedValue({
      imageUrls: ['https://blob.vercel.com/photo.jpg'],
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(prisma.boxStateHistory.update).toHaveBeenCalledWith({
      where: { id: 'hist-1' },
      data: { imageUrls: ['https://blob.vercel.com/photo.jpg'] },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ imageUrls: ['https://blob.vercel.com/photo.jpg'] });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest "src/__tests__/api/boxes/history/images.test.ts" --no-coverage
```

Expected: FAIL — `Cannot find module '@/pages/api/boxes/history/[id]/images'`

- [ ] **Step 3: Create the directory and route**

Create directory `src/pages/api/boxes/history/[id]/`, then create `src/pages/api/boxes/history/[id]/images.ts`:

```typescript
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { id } = req.query as { id: string };
  const { imageUrls } = req.body as { imageUrls: string[] };

  if (!Array.isArray(imageUrls)) {
    return res.status(400).json({ error: 'imageUrls must be an array' });
  }

  if (imageUrls.length > 3) {
    return res.status(400).json({ error: 'Maximum 3 images per entry' });
  }

  const entry = await prisma.boxStateHistory.findFirst({
    where: { id },
    include: {
      box: {
        include: {
          project: {
            include: {
              projectUsers: { where: { userId: req.userId } },
            },
          },
        },
      },
    },
  });

  if (!entry) {
    return res.status(404).json({ error: 'History entry not found' });
  }

  if (!entry.box.project.projectUsers.length) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updated = await prisma.boxStateHistory.update({
    where: { id },
    data: { imageUrls },
  });

  return res.status(200).json({ imageUrls: updated.imageUrls });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest "src/__tests__/api/boxes/history/images.test.ts" --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/boxes/history src/__tests__/api/boxes/history
git commit -m "feat: add PATCH /api/boxes/history/[id]/images"
```

---

## Task 5: Image view/proxy route

**Files:**
- Create: `src/__tests__/api/images/view.test.ts`
- Create: `src/pages/api/images/view.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/images/view.test.ts`:

```typescript
import handler from '@/pages/api/images/view';
import prisma from '@/lib/db';

jest.mock('@/lib/db', () => ({
  boxStateHistory: { findFirst: jest.fn() },
}));
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: jest.fn(async (req: any) => { req.userId = 'user-1'; }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const ORIG_URL =
  'https://xxx.blob.vercel-storage.com/projects/proj-1/boxes/box-1/history/hist-1/photo.jpg';
const THUMB_URL =
  'https://xxx.blob.vercel-storage.com/projects/proj-1/boxes/box-1/history/hist-1/thumb_photo.jpg';

function makeReq(query: Partial<Record<string, string>> = {}) {
  return {
    method: 'GET',
    query: { url: ORIG_URL, size: 'full', ...query },
  } as any;
}

function makeRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    headersSent: false,
  };
  return res;
}

function mockBlobResponse() {
  return {
    ok: true,
    headers: { get: jest.fn().mockReturnValue('image/jpeg') },
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('img').buffer),
  };
}

describe('GET /api/images/view', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-GET', async () => {
    const res = makeRes();
    await handler({ ...makeReq(), method: 'POST' } as any, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 if url param is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ url: undefined }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 if no matching history entry found', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('fetches thumbnail URL when size=thumb', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    mockFetch.mockResolvedValue(mockBlobResponse());

    await handler(makeReq({ size: 'thumb' }), makeRes());

    expect(mockFetch).toHaveBeenCalledWith(
      THUMB_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }),
      }),
    );
  });

  it('proxies the blob and sets Content-Type header', async () => {
    (prisma.boxStateHistory.findFirst as jest.Mock).mockResolvedValue({
      box: { project: { projectUsers: [{ userId: 'user-1' }] } },
    });
    mockFetch.mockResolvedValue(mockBlobResponse());

    const res = makeRes();
    await handler(makeReq(), res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(res.end).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest src/__tests__/api/images/view.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/pages/api/images/view'`

- [ ] **Step 3: Create the view route**

Create `src/pages/api/images/view.ts`:

```typescript
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

function deriveThumbnailUrl(url: string): string {
  const parts = url.split('/');
  parts[parts.length - 1] = `thumb_${parts[parts.length - 1]}`;
  return parts.join('/');
}

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await withAuth(req, res);
  if (res.headersSent) return;

  const { url, size } = req.query as Record<string, string>;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const entry = await prisma.boxStateHistory.findFirst({
    where: { imageUrls: { has: url } },
    include: {
      box: {
        include: {
          project: {
            include: {
              projectUsers: { where: { userId: req.userId } },
            },
          },
        },
      },
    },
  });

  if (!entry || !entry.box.project.projectUsers.length) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const fetchUrl = size === 'thumb' ? deriveThumbnailUrl(url) : url;

  try {
    const response = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Blob not found' });
    }

    const contentType = response.headers.get('Content-Type') ?? 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error('View error:', error);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
```

- [ ] **Step 4: Run all API tests**

```bash
npx jest src/__tests__/api --no-coverage
```

Expected: PASS — all 14 tests across the three test files

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/images/view.ts src/__tests__/api/images/view.test.ts
git commit -m "feat: add GET /api/images/view proxy for private blobs"
```

---

## Task 6: Scanner UI — image picker section

**Files:**
- Modify: `src/pages/scanner.tsx`
- Modify: `messages/en.json`
- Modify: `messages/fi.json`

- [ ] **Step 1: Add useRef to the React import**

In `src/pages/scanner.tsx`, replace the import on line 4:

```typescript
import { useEffect, useState } from 'react';
```

With:

```typescript
import { useEffect, useState, useRef } from 'react';
```

- [ ] **Step 2: Add image-related state variables after pendingScanQr state (line 57)**

In `src/pages/scanner.tsx`, after `const [pendingScanQr, setPendingScanQr] = useState<string | null>(null);`, add:

```typescript
  const [pendingImages, setPendingImages] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<(string | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [uploadWarning, setUploadWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Add image helper functions after handleAddBox (after line 202)**

In `src/pages/scanner.tsx`, after the closing `}` of `handleAddBox`, add:

```typescript
  function resetImages() {
    imagePreviewUrls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
    setPendingImages([null, null, null]);
    setImagePreviewUrls([null, null, null]);
    setUploadWarning('');
  }

  function handleSlotClick(slotIndex: number) {
    setActiveSlot(slotIndex);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || activeSlot === null) return;
    const newImages = [...pendingImages];
    newImages[activeSlot] = file;
    setPendingImages(newImages);
    const newPreviews = [...imagePreviewUrls];
    if (newPreviews[activeSlot]) URL.revokeObjectURL(newPreviews[activeSlot]!);
    newPreviews[activeSlot] = URL.createObjectURL(file);
    setImagePreviewUrls(newPreviews);
    e.target.value = '';
    setActiveSlot(null);
  }

  function handleRemoveImage(slotIndex: number) {
    const newImages = [...pendingImages];
    const newPreviews = [...imagePreviewUrls];
    if (newPreviews[slotIndex]) URL.revokeObjectURL(newPreviews[slotIndex]!);
    newImages[slotIndex] = null;
    newPreviews[slotIndex] = null;
    setPendingImages(newImages);
    setImagePreviewUrls(newPreviews);
  }
```

- [ ] **Step 4: Update handleRescan to reset images**

In `src/pages/scanner.tsx`, replace `handleRescan`:

```typescript
  function handleRescan() {
    setPendingScanQr(null);
    setCondition('ok');
    setNotes('');
    setLastMessage('');
    resetImages();
    setAddBoxFormOpen(false);
    setScannerOpen(true);
  }
```

- [ ] **Step 5: Replace handleConfirmScan to upload images after scan**

In `src/pages/scanner.tsx`, replace the entire `handleConfirmScan` function:

```typescript
  async function handleConfirmScan() {
    if (!pendingScanQr || !selectedProjectId || isProcessing) return;
    setIsProcessing(true);
    try {
      const { data } = await axios.post('/api/boxes/scan', {
        projectId: selectedProjectId,
        qrCode: pendingScanQr,
        action: scanMode,
        condition,
        notes,
      });

      const filesToUpload = pendingImages.filter((f): f is File => f !== null);
      if (filesToUpload.length > 0 && data.historyId) {
        try {
          const uploadedUrls: string[] = [];
          for (const file of filesToUpload) {
            const params = new URLSearchParams({
              filename: file.name,
              historyId: data.historyId,
              projectId: selectedProjectId,
              boxId: data.box.id,
            });
            const uploadRes = await axios.post(
              `/api/images/upload?${params}`,
              file,
              { headers: { 'Content-Type': file.type || 'application/octet-stream' } },
            );
            uploadedUrls.push(uploadRes.data.url);
          }
          await axios.patch(`/api/boxes/history/${data.historyId}/images`, {
            imageUrls: uploadedUrls,
          });
        } catch {
          setUploadWarning(t('photoUploadFailed'));
        }
      }

      setLastMessage(`${data.box.label || 'Box'} — ${tStates(data.newState)}`);
      setLastMessageType('success');
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
      setPendingScanQr(null);
      setNotes('');
      setCondition('ok');
      resetImages();
      setTimeout(() => setScannerOpen(true), 1500);
    } catch (error: any) {
      const isNotFound = error.response?.status === 404;
      if (isNotFound && canAddBoxes) {
        setAddBoxFormOpen(true);
        setAddBoxQr(pendingScanQr);
        setAddBoxLabel('');
        setAddBoxError('');
      } else {
        setLastMessage(error.response?.data?.error || t('scanFailed'));
        setLastMessageType('error');
      }
    } finally {
      setIsProcessing(false);
    }
  }
```

- [ ] **Step 6: Add the image picker JSX inside the confirm panel**

In `src/pages/scanner.tsx`, after the closing `</div>` of the notes `<textarea>` block (the `</div>` that closes `<div>` on the notes label line), add the following before the `{addBoxFormOpen && addBoxForm}` line:

```tsx
              <div>
                <label className="block text-slate-200 font-semibold mb-3">
                  {t('photosOptional')}
                </label>
                <div className="flex gap-3">
                  {[0, 1, 2].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        imagePreviewUrls[slot]
                          ? handleRemoveImage(slot)
                          : handleSlotClick(slot)
                      }
                      className="relative w-20 h-20 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center overflow-hidden bg-slate-700 hover:border-slate-400 transition"
                    >
                      {imagePreviewUrls[slot] ? (
                        <>
                          <img
                            src={imagePreviewUrls[slot]!}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl">
                            ✕
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl text-slate-400">+</span>
                      )}
                    </button>
                  ))}
                </div>
                {uploadWarning && (
                  <p className="text-xs text-amber-400 mt-2">{uploadWarning}</p>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
```

- [ ] **Step 7: Add i18n key to messages/en.json**

In `messages/en.json`, inside the `"scanner"` object, add after `"boxAdded"`:

```json
    "photosOptional": "Photos (optional)",
    "photoUploadFailed": "Scan saved. Photo upload failed."
```

- [ ] **Step 8: Add i18n key to messages/fi.json**

In `messages/fi.json`, find the `"scanner"` section and add after its equivalent of `"boxAdded"`:

```json
    "photosOptional": "Kuvat (valinnainen)",
    "photoUploadFailed": "Skannaus tallennettu. Kuvan lataus epäonnistui."
```

- [ ] **Step 9: Verify TypeScript**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add src/pages/scanner.tsx messages/en.json messages/fi.json
git commit -m "feat: add image picker to scan confirmation flow"
```

---

## Task 7: Dashboard — thumbnails + lightbox

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add lightbox state variable after editError state (line 42)**

In `src/components/Dashboard.tsx`, after `const [editError, setEditError] = useState('');`, add:

```typescript
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
```

- [ ] **Step 2: Add thumbnail strip to history entries**

In `src/components/Dashboard.tsx`, inside the `history.map()` block, replace the existing history entry `<div>`:

```tsx
                    <div key={h.id} className="bg-slate-700 border border-slate-600 p-4 rounded-lg">
                      <div className="font-medium text-slate-50">{tStates(h.state as BoxState)}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                      {h.notes && <div className="mt-2 text-slate-300 text-sm">{h.notes}</div>}
                      {h.condition && (
                        <div className="text-xs font-medium text-slate-400 mt-1">
                          {tCommon('condition')}: {h.condition}
                        </div>
                      )}
                    </div>
```

With:

```tsx
                    <div key={h.id} className="bg-slate-700 border border-slate-600 p-4 rounded-lg">
                      <div className="font-medium text-slate-50">{tStates(h.state as BoxState)}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                      {h.notes && <div className="mt-2 text-slate-300 text-sm">{h.notes}</div>}
                      {h.condition && (
                        <div className="text-xs font-medium text-slate-400 mt-1">
                          {tCommon('condition')}: {h.condition}
                        </div>
                      )}
                      {h.imageUrls?.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {h.imageUrls.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() =>
                                setLightboxUrl(
                                  `/api/images/view?url=${encodeURIComponent(url)}&size=full`,
                                )
                              }
                              className="w-16 h-16 rounded overflow-hidden border border-slate-500 hover:border-blue-400 transition"
                            >
                              <img
                                src={`/api/images/view?url=${encodeURIComponent(url)}&size=thumb`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
```

- [ ] **Step 3: Add lightbox overlay**

In `src/components/Dashboard.tsx`, just before the final closing `</>` (the very last line before the closing `}`), add:

```tsx
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-slate-300 transition"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: show image thumbnails and lightbox in box history"
```

---

## Post-implementation: run migration on remote

The `imageUrls` field was added to the schema. After deploying, run:

```bash
npx prisma migrate deploy
```

(Use the `DIRECT_URL` direct connection string — see CLAUDE.md "Running Prisma migrations" section.)

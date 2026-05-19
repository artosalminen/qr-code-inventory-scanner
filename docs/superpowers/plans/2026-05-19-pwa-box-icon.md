# PWA Box Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder solid-blue square PWA icons with an isometric 3D box icon that shows in the browser tab and on the home screen when the app is installed as a PWA.

**Architecture:** A single SVG file is the source of truth for the icon. A one-time Node.js script uses `sharp` (already installed) to rasterize it to the 192×192 and 512×512 PNGs the manifest references. Next.js App Router metadata wires up the favicon for browser tabs. The `manifest.json` already has correct icon paths — only the PNG contents need replacing.

**Tech Stack:** SVG, Node.js, sharp v0.34, Next.js 16 App Router metadata API

---

### Task 1: Create the isometric box SVG

**Files:**
- Create: `public/icons/icon.svg`
- Create: `public/favicon.svg`

- [ ] **Step 1: Create the SVG source**

Create `public/icons/icon.svg` with this exact content:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#2563eb"/>
  <polygon points="50,18 80,33 50,48 20,33" fill="white" opacity="0.95"/>
  <polygon points="20,33 50,48 50,75 20,60" fill="white" opacity="0.75"/>
  <polygon points="50,48 80,33 80,60 50,75" fill="white" opacity="0.55"/>
</svg>
```

The three polygons form an isometric box:
- First polygon: top face (brightest, light source above)
- Second polygon: left face (mid-shade)
- Third polygon: right face (darkest, shadow side)

- [ ] **Step 2: Copy to favicon.svg**

```bash
cp public/icons/icon.svg public/favicon.svg
```

- [ ] **Step 3: Commit**

```bash
git add public/icons/icon.svg public/favicon.svg
git commit -m "feat: add isometric box SVG icon source"
```

---

### Task 2: Generate PNG icons from SVG using sharp

**Files:**
- Create: `scripts/generate-icons.js`
- Replace: `public/icons/icon-192.png`
- Replace: `public/icons/icon-512.png`

- [ ] **Step 1: Create the generation script**

Create `scripts/generate-icons.js`:

```javascript
const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outDir = path.join(__dirname, '..', 'public', 'icons');

async function generate() {
  await sharp(svgPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512.png'));
  console.log('Generated icon-512.png');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script**

```bash
node scripts/generate-icons.js
```

Expected output:
```
Generated icon-192.png
Generated icon-512.png
```

- [ ] **Step 3: Verify PNG dimensions**

```bash
node -e "const s=require('sharp'); Promise.all([s('public/icons/icon-192.png').metadata(), s('public/icons/icon-512.png').metadata()]).then(([a,b])=>{ console.log(a.width+'x'+a.height); console.log(b.width+'x'+b.height); })"
```

Expected output:
```
192x192
512x512
```

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-icons.js public/icons/icon-192.png public/icons/icon-512.png
git commit -m "feat: generate 192px and 512px box icons via sharp"
```

---

### Task 3: Wire favicon into Next.js App Router layout

**Files:**
- Modify: `src/app/layout.tsx`

Current file has no `metadata` export. Add one.

- [ ] **Step 1: Update layout.tsx**

Replace the entire file with:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-950 text-slate-50">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. (If build is slow, `npx tsc --noEmit` is faster.)

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add favicon and apple-touch-icon metadata to layout"
```

---

### Task 4: Visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check browser tab favicon**

Open `http://localhost:3000`. The browser tab should show the isometric blue box icon, not the Next.js leaf or a blank square.

- [ ] **Step 3: Check PWA manifest in DevTools**

In Chrome: DevTools → Application → Manifest.

Verify:
- Icons section lists 192×192 and 512×512 entries with no error warnings
- Icon previews show the isometric box (not a blank or broken image)
- `theme_color` is shown as `#2563eb`

- [ ] **Step 4: Check apple-touch-icon in page source**

In the browser, view page source and search for `apple`. Expect to find:

```html
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

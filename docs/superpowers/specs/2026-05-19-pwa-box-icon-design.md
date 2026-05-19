# PWA Box Icon Design

**Date:** 2026-05-19  
**Status:** Approved

## Summary

Replace the current placeholder solid-blue square PWA icons with an isometric 3D box icon that visually represents the app's purpose (equipment box tracking). The same graphic serves as both the browser tab favicon and the installed PWA app icon.

## Visual Design

- **Canvas:** 100×100 viewBox, `#2563eb` (Tailwind blue-600) background with `rx=22` rounded corners — matches the existing `theme_color` in `manifest.json`
- **Icon:** Isometric box with three visible faces, all white at varying opacities:
  - Top face: `opacity: 0.95` (brightest — light source above)
  - Left face: `opacity: 0.75` (mid-shade)
  - Right face: `opacity: 0.55` (shadow side)
- **No stroke/outline** — opacity difference alone creates the depth illusion

### SVG Geometry (viewBox 0 0 100 100)

```
Top face:    polygon points="50,18 80,33 50,48 20,33"
Left face:   polygon points="20,33 50,48 50,75 20,60"
Right face:  polygon points="50,48 80,33 80,60 50,75"
```

## Files

| File | Action | Purpose |
|---|---|---|
| `public/icons/icon.svg` | Create | Master SVG source |
| `public/favicon.svg` | Create | Browser tab favicon (copy of icon.svg) |
| `public/icons/icon-192.png` | Replace | PWA home screen icon (small) |
| `public/icons/icon-512.png` | Replace | PWA splash / install icon (large) |
| `scripts/generate-icons.js` | Create | Node.js script: SVG → PNG via sharp |
| `src/app/layout.tsx` | Update | Add Next.js metadata for favicon and apple-touch-icon |

## Generation

`sharp` is already a project dependency. The generation script:
1. Reads `public/icons/icon.svg`
2. Resizes to 192×192 and 512×512 via `sharp().resize().png()`
3. Writes output PNGs to `public/icons/`

Run once with: `node scripts/generate-icons.js`

## layout.tsx metadata addition

```tsx
export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
};
```

## Out of Scope

- Maskable icon variant (existing manifest entry is acceptable for MVP)
- Dark-mode icon variant
- Animated icon

# Camera Action Sheet for Image Picker

**Date:** 2026-05-19  
**Status:** Approved  

## Problem

The scan confirmation image picker uses a single `input[type=file]` with no `capture` attribute. On iOS this already presents a native action sheet offering camera or gallery. On Android Chrome it opens the file manager directly, bypassing the camera. Users cannot take a new photo during a scan confirmation on Android.

## Goal

When a user taps an empty image slot, show a bottom action sheet with two choices: **Take photo** and **Choose from library**. Both options work reliably on iOS and Android.

## Scope

Changes are confined to `src/pages/scanner.tsx`. No new files, no API changes, no database changes.

## Design

### Two hidden inputs

Replace the single hidden file input with two:

```tsx
<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
<input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
```

- `cameraInputRef` — `capture="environment"` opens the rear camera directly
- `galleryInputRef` — no capture, opens the system file/gallery picker
- Both share the existing `handleFileChange` handler unchanged
- `accept` changed from specific MIME types to `image/*` for broadest mobile compatibility

### State change

Add one new state value:

```ts
const [actionSheetSlot, setActionSheetSlot] = useState<number | null>(null);
```

`null` = sheet hidden. A slot index (0–2) = sheet open for that slot.

### Slot tap behaviour

- **Empty slot tapped** → set `actionSheetSlot` to the slot index (opens sheet). No longer calls `fileInputRef.current.click()` directly.
- **Filled slot tapped** → existing remove behaviour unchanged.

### Action sheet UI

Fixed overlay rendered when `actionSheetSlot !== null`:

```
┌──────────────────────────────────┐
│  (semi-transparent backdrop)     │
│                                  │
│  ┌────────────────────────────┐  │
│  │  📷  Take photo            │  │
│  │  🖼   Choose from library  │  │
│  │  ──────────────────────    │  │
│  │        Cancel              │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

- Full-screen fixed overlay, backdrop closes sheet on tap
- White rounded card anchored to bottom of screen
- Two action buttons (camera, gallery) + a Cancel button
- CSS `transition` for slide-up animation (optional, nice-to-have)
- Labels use existing i18n keys where possible; add `takePhoto`, `chooseFromLibrary`, `cancel` keys if missing

### Action sheet handlers

```
"Take photo" tapped    → cameraInputRef.current.click(), setActionSheetSlot(null)
"Choose from library"  → galleryInputRef.current.click(), setActionSheetSlot(null)
"Cancel" / backdrop    → setActionSheetSlot(null)
```

`activeSlot` is set to `actionSheetSlot` before triggering the input click so `handleFileChange` writes to the correct slot.

### Cleanup

Remove the old single `fileInputRef` and its direct `.click()` call in `handleSlotClick`. The `handleSlotClick` function is either removed or repurposed as the empty-slot tap handler that sets `actionSheetSlot`.

## Out of scope

- Video capture
- Drag-and-drop
- Paste-from-clipboard
- Desktop-specific UX changes (action sheet still works on desktop but is not optimised for it)

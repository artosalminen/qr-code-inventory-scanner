# Camera Action Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user taps an empty image slot in the scan confirmation flow, show a bottom action sheet offering "Take photo" (camera) and "Choose from library" (gallery) instead of opening the file picker directly.

**Architecture:** Two hidden `<input type="file">` elements — one with `capture="environment"` for camera, one without for gallery — replace the current single input. A new `actionSheetSlot` state drives a fixed-position overlay with two action buttons. Both inputs share the existing `handleFileChange` handler unchanged.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, next-intl

---

### Task 1: Add i18n translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/fi.json`

- [ ] **Step 1: Add English keys**

In `messages/en.json`, inside the `"scanner"` object, add two lines after `"photoUploadFailed"`:

```json
    "takePhoto": "Take photo",
    "chooseFromLibrary": "Choose from library"
```

The scanner block should end:
```json
    "photosOptional": "Photos (optional)",
    "photoUploadFailed": "Scan saved. Photo upload failed.",
    "takePhoto": "Take photo",
    "chooseFromLibrary": "Choose from library"
  },
```

- [ ] **Step 2: Add Finnish keys**

In `messages/fi.json`, inside the `"scanner"` object, add two lines after `"photoUploadFailed"`:

```json
    "takePhoto": "Ota kuva",
    "chooseFromLibrary": "Valitse kirjastosta"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/fi.json
git commit -m "feat: add takePhoto and chooseFromLibrary i18n keys"
```

---

### Task 2: Implement the action sheet in scanner.tsx

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Replace the single ref with two refs**

Find (line 62):
```typescript
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Replace with:
```typescript
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 2: Add actionSheetSlot state**

Find (line 61):
```typescript
  const [uploadWarning, setUploadWarning] = useState('');
```

Replace with:
```typescript
  const [uploadWarning, setUploadWarning] = useState('');
  const [actionSheetSlot, setActionSheetSlot] = useState<number | null>(null);
```

- [ ] **Step 3: Replace handleSlotClick and add action sheet handlers**

Find (lines 245–248):
```typescript
  function handleSlotClick(slotIndex: number) {
    setActiveSlot(slotIndex);
    fileInputRef.current?.click();
  }
```

Replace with:
```typescript
  function handleSlotClick(slotIndex: number) {
    setActiveSlot(slotIndex);
    setActionSheetSlot(slotIndex);
  }

  function handleTakePhoto() {
    setActionSheetSlot(null);
    cameraInputRef.current?.click();
  }

  function handleChooseFromLibrary() {
    setActionSheetSlot(null);
    galleryInputRef.current?.click();
  }

  function handleDismissActionSheet() {
    setActionSheetSlot(null);
    setActiveSlot(null);
  }
```

- [ ] **Step 4: Replace the single hidden input with two**

Find (lines 444–450):
```tsx
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
```

Replace with:
```tsx
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
```

- [ ] **Step 5: Add the action sheet overlay**

Find the closing `</Layout>` tag at the very end of the return statement. Add the overlay just before it:

```tsx
        {actionSheetSlot !== null && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={handleDismissActionSheet}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div
              className="relative w-full max-w-lg bg-slate-800 rounded-t-2xl p-4 space-y-2 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleTakePhoto}
                className="w-full px-4 py-4 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-lg font-medium transition flex items-center gap-3"
              >
                <span className="text-xl">📷</span>
                <span>{t('takePhoto')}</span>
              </button>
              <button
                onClick={handleChooseFromLibrary}
                className="w-full px-4 py-4 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-lg font-medium transition flex items-center gap-3"
              >
                <span className="text-xl">🖼️</span>
                <span>{t('chooseFromLibrary')}</span>
              </button>
              <div className="pt-1">
                <button
                  onClick={handleDismissActionSheet}
                  className="w-full px-4 py-4 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add camera/gallery action sheet to image picker"
```

---

### Manual test checklist

After implementation, verify on a mobile device or browser dev tools (responsive mode):

1. Open scanner, select a project, scan a QR code to reach the confirmation screen
2. Tap an empty image slot → action sheet slides up with "Take photo", "Choose from library", "Cancel"
3. Tap backdrop → sheet dismisses, no slot filled
4. Tap "Cancel" → sheet dismisses
5. Tap slot again → tap "Take photo" → camera opens (on real device) or file picker with camera option
6. Tap slot again → tap "Choose from library" → gallery/file picker opens
7. Select an image → preview appears in the tapped slot
8. Tap a filled slot → red × remove button (no action sheet)
9. Confirm scan → image uploads successfully

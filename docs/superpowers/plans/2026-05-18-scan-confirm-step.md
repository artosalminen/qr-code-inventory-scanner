# Scan Confirmation Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move condition and notes entry to after the QR scan via a confirmation card, so users scan first and fill in details second.

**Architecture:** `handleScan` no longer calls the API — it stores the scanned QR in `pendingScanQr` and closes the scanner. A new `handleConfirmScan` makes the actual API call. The confirmation card (shown when `pendingScanQr !== null`) replaces the main scanner card and contains condition, notes, Confirm, and Re-scan. The main scanner card loses its condition/notes inputs.

**Tech Stack:** React hooks, Tailwind CSS, Axios

---

## File Map

| File | Change |
|---|---|
| `src/pages/scanner.tsx` | Only file changed |

---

### Task 1: Add state, update handleScan, add handleConfirmScan and handleRescan

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Add pendingScanQr state after isAddingBox**

```tsx
const [isAddingBox, setIsAddingBox] = useState(false);
const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
const [pendingScanQr, setPendingScanQr] = useState<string | null>(null);
```

- [ ] **Step 2: Add setPendingScanQr(null) to the existing reset useEffect**

Find:
```tsx
  useEffect(() => {
    setAddBoxFormOpen(false);
    setAddBoxQr('');
    setAddBoxLabel('');
    setAddBoxError('');
  }, [selectedProjectId, scanMode]);
```

Replace with:
```tsx
  useEffect(() => {
    setPendingScanQr(null);
    setAddBoxFormOpen(false);
    setAddBoxQr('');
    setAddBoxLabel('');
    setAddBoxError('');
    setLastMessage('');
  }, [selectedProjectId, scanMode]);
```

- [ ] **Step 3: Replace handleScan — no API call, just capture the QR**

Find the entire `handleScan` function and replace:
```tsx
  async function handleScan(qrCode: string) {
    if (!selectedProjectId || isProcessing) return;
    setPendingScanQr(qrCode);
    setScannerOpen(false);
    setLastMessage('');
  }
```

- [ ] **Step 4: Add handleConfirmScan after handleScan**

```tsx
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
      setLastMessage(`${data.box.label || 'Box'} — ${data.newState}`);
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
      setTimeout(() => setScannerOpen(true), 1500);
    } catch (error: any) {
      const isNotFound = error.response?.status === 404;
      if (isNotFound && canAddBoxes) {
        setAddBoxFormOpen(true);
        setAddBoxQr(pendingScanQr);
        setAddBoxLabel('');
        setAddBoxError('');
      } else {
        setLastMessage(error.response?.data?.error || 'Scan failed');
        setLastMessageType('error');
      }
    } finally {
      setIsProcessing(false);
    }
  }
```

- [ ] **Step 5: Add handleRescan after handleConfirmScan**

```tsx
  function handleRescan() {
    setPendingScanQr(null);
    setCondition('ok');
    setNotes('');
    setLastMessage('');
    setAddBoxFormOpen(false);
    setScannerOpen(true);
  }
```

- [ ] **Step 6: Remove scanHistory update from the old handleScan location in handleAddBox**

`handleAddBox` still pushes to scanHistory on success — no change needed there.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep scanner
```
Expected: no output

- [ ] **Step 8: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: add pendingScanQr state and confirm/rescan handlers"
```

---

### Task 2: Rework scanner JSX — remove condition/notes, add confirmation card

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Remove the Condition Selection block from the scanner card**

Find and remove this entire block:
```tsx
            {/* Condition Selection */}
            {['check_in', 'check_out'].includes(scanMode) && (
              <div>
                <label className="block text-slate-200 font-semibold mb-3">Item Condition</label>
                <div className="flex gap-3">
                  {[
                    { value: 'ok', label: '✓ OK', icon: '👍' },
                    { value: 'damaged', label: '⚠️ Damaged', icon: '🔧' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCondition(opt.value)}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                        condition === opt.value
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 2: Remove the Notes block from the scanner card**

Find and remove:
```tsx
            {/* Notes */}
            <div>
              <label className="block text-slate-200 font-semibold mb-3">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Add any notes about this scan..."
              />
            </div>
```

- [ ] **Step 3: Remove the Add Box Form / Status Message conditional from the scanner card**

Find and remove this entire block (it will move into the confirmation card):
```tsx
            {/* Add Box Form — shown on unknown scan or manual add */}
            {addBoxFormOpen ? (
              ...entire block...
            ) : (
              /* Status Message */
              lastMessage && (
                ...
              )
            )}
```

- [ ] **Step 4: Replace the entire Main Scanner Card block with a conditional that shows either the confirmation card or the scanner card**

Find:
```tsx
        {/* Main Scanner Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
```

Replace everything from that line through its closing `</div>` with:

```tsx
        {/* Status Message — shown outside both cards */}
        {lastMessage && !pendingScanQr && (
          <div
            className={`p-4 rounded-lg font-semibold flex items-center gap-3 transition ${
              lastMessageType === 'success'
                ? 'bg-green-900 border border-green-600 text-green-200'
                : 'bg-red-900 border border-red-600 text-red-200'
            }`}
          >
            <span className="text-2xl">{lastMessageType === 'success' ? '✓' : '✗'}</span>
            <span>{lastMessage}</span>
          </div>
        )}

        {pendingScanQr !== null ? (
          /* Confirmation Card */
          <div className="bg-slate-800 border border-blue-600 rounded-lg overflow-hidden">
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-50 mb-1">Confirm Scan</h2>
                <p className="text-slate-400 text-sm">
                  {scanModes.find((m) => m.value === scanMode)?.icon}{' '}
                  {scanModes.find((m) => m.value === scanMode)?.label}
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">QR Code</div>
                <div className="font-mono text-slate-50 text-sm break-all">{pendingScanQr}</div>
              </div>

              {['check_in', 'check_out'].includes(scanMode) && (
                <div>
                  <label className="block text-slate-200 font-semibold mb-3">Item Condition</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'ok', label: '✓ OK', icon: '👍' },
                      { value: 'damaged', label: '⚠️ Damaged', icon: '🔧' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setCondition(opt.value)}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                          condition === opt.value
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-200 font-semibold mb-3">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Add any notes about this scan..."
                />
              </div>

              {/* Add Box Form — shown when unknown QR in check_in mode */}
              {addBoxFormOpen && (
                <div className="bg-slate-700 border border-green-600 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-50">Add New Box</h3>
                    <button
                      onClick={() => setAddBoxFormOpen(false)}
                      className="text-slate-400 hover:text-slate-200 transition"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">QR Code *</label>
                    <input
                      type="text"
                      value={addBoxQr}
                      onChange={(e) => setAddBoxQr(e.target.value)}
                      placeholder="QR code..."
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Label (optional)</label>
                    <input
                      type="text"
                      value={addBoxLabel}
                      onChange={(e) => setAddBoxLabel(e.target.value)}
                      placeholder="Human-readable label..."
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-600 rounded-lg px-3 py-2">
                    Condition: <span className="text-slate-200 font-medium capitalize">{condition}</span>
                    {notes && <> · Notes: <span className="text-slate-200 font-medium">{notes}</span></>}
                  </div>
                  {addBoxError && (
                    <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                      {addBoxError}
                    </p>
                  )}
                  <button
                    onClick={handleAddBox}
                    disabled={isAddingBox || !addBoxQr.trim()}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95"
                  >
                    {isAddingBox ? 'Adding...' : 'Add & Check In'}
                  </button>
                </div>
              )}

              {/* Error message */}
              {lastMessage && lastMessageType === 'error' && (
                <div className="p-4 rounded-lg font-semibold flex items-center gap-3 bg-red-900 border border-red-600 text-red-200">
                  <span className="text-2xl">✗</span>
                  <span>{lastMessage}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRescan}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition"
                >
                  Re-scan
                </button>
                <button
                  onClick={handleConfirmScan}
                  disabled={isProcessing || addBoxFormOpen}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95"
                >
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Scanner Card */
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Scan Mode Selection */}
              <div>
                <label className="block text-slate-200 font-semibold mb-3">Scan Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {scanModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setScanMode(mode.value)}
                      className={`px-4 py-3 rounded-lg font-medium transition flex flex-col items-center gap-1 text-sm ${
                        scanMode === mode.value
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-xl">{mode.icon}</span>
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QR Scanner Component */}
              {scannerOpen && (
                <div className="rounded-lg overflow-hidden border-2 border-blue-500">
                  <QRScanner isOpen={scannerOpen} onScan={handleScan} />
                </div>
              )}

              {/* Scanner Toggle Button */}
              <button
                onClick={() => setScannerOpen(!scannerOpen)}
                disabled={isProcessing}
                className={`w-full px-6 py-4 rounded-lg font-semibold transition text-lg active:scale-95 flex items-center justify-center gap-2 ${
                  scannerOpen
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {scannerOpen ? (
                  <><span>✕</span> Close Scanner</>
                ) : (
                  <><span>📱</span> Open Scanner</>
                )}
              </button>

              {/* Manual Add Box Button */}
              {canAddBoxes && !addBoxFormOpen && (
                <button
                  onClick={() => {
                    setAddBoxFormOpen(true);
                    setAddBoxQr('');
                    setAddBoxLabel('');
                    setAddBoxError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-dashed border-slate-500 text-slate-300 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <span>➕</span>
                  Add Box Manually
                </button>
              )}

              {/* Manual add box form when triggered without scan */}
              {addBoxFormOpen && (
                <div className="bg-slate-700 border border-green-600 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-50">Add New Box</h3>
                    <button
                      onClick={() => setAddBoxFormOpen(false)}
                      className="text-slate-400 hover:text-slate-200 transition"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">QR Code *</label>
                    <input
                      type="text"
                      value={addBoxQr}
                      onChange={(e) => setAddBoxQr(e.target.value)}
                      placeholder="QR code..."
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Label (optional)</label>
                    <input
                      type="text"
                      value={addBoxLabel}
                      onChange={(e) => setAddBoxLabel(e.target.value)}
                      placeholder="Human-readable label..."
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-600 rounded-lg px-3 py-2">
                    Condition: <span className="text-slate-200 font-medium capitalize">{condition}</span>
                    {notes && <> · Notes: <span className="text-slate-200 font-medium">{notes}</span></>}
                  </div>
                  {addBoxError && (
                    <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                      {addBoxError}
                    </p>
                  )}
                  <button
                    onClick={handleAddBox}
                    disabled={isAddingBox || !addBoxQr.trim()}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95"
                  >
                    {isAddingBox ? 'Adding...' : 'Add & Check In'}
                  </button>
                </div>
              )}

              {/* Touch Hint for Mobile */}
              <div className="text-center text-xs text-slate-400 bg-slate-700 rounded-lg p-3">
                💡 Position the camera to scan QR codes
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 5: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "api-projects"
```
Expected: no errors

- [ ] **Step 6: Manual smoke test**

1. Go to `/scanner`, select Check In mode
2. Open scanner, scan a known QR → scanner closes, confirmation card appears showing QR code and "Check In"
3. Condition toggles and notes textarea visible in confirmation card
4. Set condition to Damaged, add a note, click Confirm → success, scanner reopens
5. Scan an unknown QR → confirmation card shows → click Confirm → add-box form appears inside card
6. Click Re-scan → returns to scanner card, scanner opens
7. Switch to Activate mode → confirmation card has no condition toggles

- [ ] **Step 7: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: scan confirmation step — condition and notes after scan"
```

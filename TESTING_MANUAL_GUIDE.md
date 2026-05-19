# Manual Testing Guide for QR Code Scanner

## Setup

**Dev Server:** Running on http://localhost:3000

### Prerequisites
- You must be logged in with Google OAuth (redirects to login if needed)
- You must have at least one project created
- You must have a user role in the project (admin, inventory_management, installation, or read_only)

### State Machine Quick Reference

**Box States:**
- `expected` — Initial state (no history entry yet)
- `received` — Checked in by inventory
- `in_use` — Activated by installation
- `ready_for_checkout` — Returned by installation
- `departed` — Checked out by inventory

**Valid Transitions:**
1. `expected` → `received`: Action `check_in` (inventory_management, admin)
2. `received` → `in_use`: Action `activate` (all roles except read_only)
3. `in_use` → `ready_for_checkout`: Action `return` (installation, admin)
4. `ready_for_checkout` → `departed`: Action `check_out` (inventory_management, admin)
5. `received` → `departed`: Action `check_out` (inventory_management, admin) [direct checkout]
6. `received` → `received`: Action `check_in` (inventory_management, admin) [re-check]

---

## Test Setup: Creating Test Data

You need one project with test boxes in different states. If you don't have admin access, note this as a blocker.

### Option A: Admin Portal (if available)

1. Create a project named "Manual Test Project"
2. Assign yourself as `inventory_management` and `installation` roles (or create test users)
3. Add boxes via CSV upload or manually

### Option B: API (curl or Postman)

First, get your session by navigating to http://localhost:3000/auth/signin and logging in.

Then use these endpoints:

```bash
# 1. Create a test project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -b "sessionToken=YOUR_SESSION_COOKIE" \
  -d '{
    "name": "Manual Test Project",
    "description": "For testing scanner"
  }'

# Copy the project ID from response

# 2. Add boxes by POSTing to /api/projects/{id}/boxes
# Boxes start in 'expected' state

# 3. (Optionally) Assign yourself other roles or create state history entries
```

### Option C: Manual Setup via Scanner Page

1. Navigate to `/scanner`
2. If "Add Box Manually" button is visible (you have inventory_management+ role):
   - Create a test box with QR code like "TEST-BOX-001"
3. This creates the box in `expected` state (ready for check_in)

---

## Test Execution

### Step 1: Start Dev Server ✓

**Expected:** Dev server running, http://localhost:3000 responds

```
npm run dev
→ ▲ Next.js ready - started server on 0.0.0.0:3000
```

---

### Step 2: Test Valid Transition (check_in on expected box)

**Scenario:** Box in `expected` state, user has `inventory_management` role, action is `check_in`

**Preconditions:**
- Create a test box (via CSV, admin portal, or "Add Box Manually")
- Get its QR code
- Ensure box is in `expected` state (no state history entry)
- Set scanner mode to "📥 Check In"
- User role must be `inventory_management` or `admin`

**Steps:**
1. Navigate to `/scanner`
2. Select your test project from the dropdown
3. Confirm scan mode is set to "📥 Check In"
4. Click "📱 Open Scanner"
5. Scan the QR code for the test box (or manually enter it)
6. Observe the UI behavior

**Expected Observations:**
- ✓ Status card appears with spinner "Checking box status…" (animates for ~500ms)
- ✓ After loading: **Green** card appears showing:
  - Box name/label
  - "Current state: expected"
  - "✓ Ready to check_in" in green text
- ✓ Form appears below with:
  - Condition selector (👍 ok / 🔧 damaged) [required for check_in]
  - Notes textarea (optional)
  - Photos section with 3 slots (optional)
- ✓ "Confirm" and "Rescan" buttons are visible
- ✓ Fill condition (select "👍 ok")
- ✓ Optionally add notes
- ✓ Click "Confirm"
- ✓ Success message appears: "Box Label — received" (or similar)
- ✓ Scanner reopens automatically after 1.5 seconds
- ✓ Recent Scans section shows the new entry with state badge "received"

**Test Result:** [ PASS / FAIL ]

**Notes:**
- If "✗ Box not found" appears: box doesn't exist in the project
- If red card appears with "Box is in state X": state transition not allowed
- If "Your role cannot perform this action": permission denied

---

### Step 3: Test Invalid Transition (activate on departed box)

**Scenario:** Box in `departed` state, user tries `activate` action (not allowed)

**Preconditions:**
- Have a box in `departed` state (manually create via state override or progress a box through all states)
- Or use a newly created box and manually set its state via database/API
- User role must be `installation` or higher

**Steps:**
1. In scanner, change mode to "⚡ Activate"
2. Scan the departed box's QR code
3. Observe the UI

**Expected Observations:**
- ✓ Status card appears with spinner
- ✓ After loading: **Red** card appears showing:
  - Box name/label
  - "Current state: departed"
  - "✗ Box is in state departed — cannot activate" (or similar permission error)
- ✓ Form is **hidden** (no condition/notes/confirm buttons)
- ✓ Only "Rescan" button is visible
- ✓ Click "Rescan" → scanner reopens

**Test Result:** [ PASS / FAIL ]

**Notes:**
- States are validated server-side in `/api/boxes/preview` and `/api/boxes/scan`
- Error message should clearly indicate the state + action mismatch

---

### Step 4: Test Box Not Found

**Scenario:** Scan a QR code that doesn't exist in the project

**Preconditions:**
- Scanner page open
- Project selected

**Steps:**
1. Click "📱 Open Scanner"
2. Manually enter a QR code like "NONEXISTENT-BOX-12345" or scan a QR code not in the project
3. Observe the UI

**Expected Observations:**
- ✓ Status card appears with spinner
- ✓ After loading: **Red** card appears showing:
  - **No box name** (since box doesn't exist)
  - "✗ Box not found in this project"
- ✓ Form is **hidden**
- ✓ Only "Rescan" button visible
- ✓ If you have `inventory_management` role in check_in mode: "Add Box Manually" form appears below the error card
  - This allows you to create the box on the fly

**Test Result:** [ PASS / FAIL ]

---

### Step 5: Test Offline Scenario

**Scenario:** Network disabled, attempt to scan and confirm

**Preconditions:**
- Box is ready to scan (in valid state for action)
- DevTools available (F12)

**Steps:**
1. Open DevTools (F12 or Ctrl+Shift+I)
2. Go to Network tab
3. Click the throttle icon and select "Offline" (or uncheck network in settings)
4. Alternatively: Toggle "Work Offline" in Application tab
5. In scanner, attempt to scan a QR code
6. Fill in the form and click "Confirm"
7. Observe behavior
8. Re-enable network
9. Scan and confirm another box to verify online works again

**Expected Observations:**

**Before Confirm (offline):**
- ✓ Scanner page shows offline banner: "⚠️ You are offline. Changes will be queued."
- ✓ When you scan while offline:
  - No status card appears (preview requires network)
  - Form appears immediately (per spec, "as today")
  - You can fill condition/notes normally
- ✓ When you click "Confirm" while offline:
  - Scan is queued (stored in IndexedDB)
  - Message: "Scan queued" (success, not error)
  - Counter updates: "⚠️ 1 change queued"
  - If you added photos: warning "Photos can't be queued offline" (they'll need re-upload)
  - Scanner reopens after 1.5 seconds

**After Re-enabling Network:**
- ✓ Offline banner disappears
- ✓ Queued count resets to 0
- ✓ Next scan behaves normally (preview card appears, etc.)
- ✓ Queued scans are auto-synced (check `/api/boxes/scan` POST calls in Network tab)

**Test Result:** [ PASS / FAIL ]

**Notes:**
- Offline detection uses `navigator.onLine` and the `useOnlineStatus` hook
- Scans are stored in IndexedDB via `enqueue()` function
- Sync happens automatically when connection restored

---

### Step 6: Test Role-Based Denial

**Scenario:** User with `installation` role tries `check_in` action (not allowed)

**Preconditions:**
- Must have a test user or account with `installation` role
- Or manually change your role in the database
- Box must be in `expected` or `received` state

**Steps:**
1. Log in as (or switch to) an `installation` user
2. Navigate to `/scanner`
3. Select the same test project
4. Scan a box in `expected` state
5. Observe the scanner mode buttons

**Expected Observations:**
- ✓ "📥 Check In" button is **disabled** (grayed out, cursor: not-allowed)
- ✓ "📤 Check Out" button is **disabled**
- ✓ "⚡ Activate" button is **enabled**
- ✓ If you try to scan with the check_in button disabled:
  - If you somehow enable it (via DevTools), the error should still be caught server-side
- ✓ Scan an `expected` box with `activate` mode (should fail with state error, not permission error)
- ✓ Expected red card: "✗ Box is in state expected — cannot activate"

**Test Result:** [ PASS / FAIL ]

**Notes:**
- Permissions are validated both in the UI (`disabled` attribute) and server-side (API returns 403)
- If the UI is bypassed (DevTools), the API still enforces permissions

---

## Test Summary

### Status Checklist

- [ ] Step 1: Dev Server Running
- [ ] Step 2: Valid Transition (check_in) — PASS/FAIL
- [ ] Step 3: Invalid Transition (activate on departed) — PASS/FAIL
- [ ] Step 4: Box Not Found — PASS/FAIL
- [ ] Step 5: Offline Scenario — PASS/FAIL
- [ ] Step 6: Role-Based Denial — PASS/FAIL

### Overall Status

**All Tests:** [ ALL PASS / SOME FAILURES / BLOCKED ]

### Failures Summary

If any test failed, document:
1. Test name
2. Expected behavior
3. Actual behavior
4. Error message (if any)
5. Steps to reproduce

---

## Troubleshooting

### Issue: "Box not found in this project"

**Causes:**
1. Box doesn't exist in the database
2. Box exists but in a different project
3. QR code is different (case-sensitive)

**Solution:**
- Verify box was created in the right project
- Check database: `SELECT * FROM boxes WHERE qr_code = 'YOUR_QR'`

### Issue: Scanner is not opening / Camera not working

**Causes:**
1. HTTPS required for camera access (localhost works)
2. Permissions denied by OS
3. Browser tab not in focus

**Solution:**
- Ensure you're on localhost (not 127.0.0.1)
- Check browser permissions for camera
- Click the scanner tab in focus

### Issue: Status card says "loading" forever

**Causes:**
1. Network error to `/api/boxes/preview`
2. Server error
3. Network tab throttled too much

**Solution:**
- Check Network tab in DevTools for failed requests
- Check server logs in terminal
- Disable throttling temporarily

### Issue: Offline mode not working

**Causes:**
1. `useOnlineStatus` hook not functioning
2. IndexedDB not available (private browsing)
3. Network is actually still connected

**Solution:**
- Use a real offline mode: unplug ethernet or use flight mode
- Check if indexedDB is available: `console.log(window.indexedDB)`
- Verify offline banner appears

---

## Final Notes

- All state changes are **permanent** (audit trail in `box_state_history`)
- WebSocket events are **not tested here** (requires separate UI testing with multiple users)
- Photos are stored in **Vercel Blob** (if deployed) or **local storage** (development)
- Timestamps in history entries are server-generated (`createdAt`)

**Test Date:** [Fill in when testing]  
**Tester:** [Your name]  
**Overall Result:** [ALL PASS / FAILURES NOTED]

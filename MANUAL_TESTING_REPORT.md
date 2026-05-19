# Manual Testing Report - QR Code Scanner Feature

**Date:** 2026-05-19  
**Tester:** [To be filled in]  
**Dev Server:** http://localhost:3000  
**Test Status:** [ PENDING ]

---

## Executive Summary

This document records the results of manual testing for the QR code scanner feature, including:
- Valid state transitions (check_in on expected box)
- Invalid state transitions (invalid state/role combinations)
- Error scenarios (box not found, offline mode)
- Permission enforcement (role-based access control)

---

## Test Environment

| Component | Status |
|-----------|--------|
| Dev Server | Running ✓ |
| Database | Connected ✓ |
| Browser | [Your Browser] |
| Viewport | Desktop / Mobile |
| Online Status | Online / Offline |

---

## Pre-Testing Checklist

- [ ] Dev server is running (`npm run dev`)
- [ ] Can access http://localhost:3000
- [ ] Logged in via Google OAuth
- [ ] Test project created with name "Manual Test Project"
- [ ] Test boxes created (TEST-BOX-001, etc.)
- [ ] Read `TESTING_MANUAL_GUIDE.md` and `TEST_DATA_SETUP.md`

---

## Test Results

### Test 1: Valid Transition (check_in on expected box)

**Status:** [ PASS / FAIL / BLOCKED ]

**Test Case ID:** TC-001  
**Scenario:** Box in `expected` state, user role `inventory_management`, action `check_in`

**Preconditions Met:**
- [ ] Box TEST-BOX-001 exists and is in `expected` state
- [ ] User has `inventory_management` or `admin` role
- [ ] Scanner page loads without errors

**Execution:**

1. Navigate to `/scanner` ✓
2. Select test project ✓
3. Confirm mode is "📥 Check In" ✓
4. Click "📱 Open Scanner" ✓
5. Scan or enter QR code `TEST-BOX-001` ✓
6. Observe status card behavior ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Status card appears | Yes (with spinner) | | ✓ ✗ ? |
| Spinner appears for ~500ms | Yes | | ✓ ✗ ? |
| Card changes color | Green (success) | | ✓ ✗ ? |
| Box name displayed | "Test Box 1" (or label) | | ✓ ✗ ? |
| Current state shown | "expected" | | ✓ ✗ ? |
| Ready message shown | "✓ Ready to check_in" | | ✓ ✗ ? |
| Condition form appears | Yes (required) | | ✓ ✗ ? |
| Notes textarea appears | Yes (optional) | | ✓ ✗ ? |
| Photos section appears | Yes (3 slots) | | ✓ ✗ ? |
| Confirm button enabled | Yes | | ✓ ✗ ? |
| Rescan button visible | Yes | | ✓ ✗ ? |

**Form Submission:**

1. Select condition "👍 ok" ✓
2. (Optional) Add notes ✓
3. (Optional) Add photos ✓
4. Click "Confirm" ✓

**After Confirmation:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| API call succeeds | Status 200 | | ✓ ✗ ? |
| Success message | "Test Box 1 — received" (or similar) | | ✓ ✗ ? |
| Message type | Green success banner | | ✓ ✗ ? |
| Scanner reopens | Auto-opens after 1.5s | | ✓ ✗ ? |
| Recent scans updated | Box appears in list with "received" badge | | ✓ ✗ ? |
| Database updated | Box state is `received` | | ✓ ✗ ? |

**Errors Encountered:**
- [ ] None
- [ ] [Describe error]

**Failure Reason (if applicable):**
```
[Describe what went wrong]
```

**Tester Notes:**
```
[Any observations or issues]
```

---

### Test 2: Invalid Transition (activate on departed box)

**Status:** [ PASS / FAIL / BLOCKED ]

**Test Case ID:** TC-002  
**Scenario:** Box in `departed` state, user tries `activate` action (should fail)

**Preconditions Met:**
- [ ] Box TEST-BOX-004 exists and is in `departed` state
- [ ] User has `installation` or higher role
- [ ] Can navigate to scanner page

**Execution:**

1. Navigate to `/scanner` ✓
2. Select test project ✓
3. Change mode to "⚡ Activate" ✓
4. Click "📱 Open Scanner" ✓
5. Scan or enter QR code `TEST-BOX-404` ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Status card appears | Yes (with spinner) | | ✓ ✗ ? |
| Card changes color | Red (error) | | ✓ ✗ ? |
| Box name displayed | "Test Box 404" | | ✓ ✗ ? |
| Current state shown | "departed" | | ✓ ✗ ? |
| Error message | "✗ Box is in state departed — cannot activate" | | ✓ ✗ ? |
| Form hidden | Yes (no condition/notes) | | ✓ ✗ ? |
| Only Rescan visible | Yes | | ✓ ✗ ? |

**After Rescan:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Scanner reopens | Yes | | ✓ ✗ ? |
| Form cleared | Yes | | ✓ ✗ ? |

**Errors Encountered:**
- [ ] None
- [ ] [Describe error]

**Tester Notes:**
```
[Any observations]
```

---

### Test 3: Box Not Found

**Status:** [ PASS / FAIL / BLOCKED ]

**Test Case ID:** TC-003  
**Scenario:** Scan a QR code that doesn't exist in the project

**Preconditions Met:**
- [ ] Scanner page open
- [ ] Test project selected
- [ ] User has role in project

**Execution:**

1. Click "📱 Open Scanner" ✓
2. Scan or enter a non-existent QR code like "NONEXISTENT-BOX-12345" ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Status card appears | Yes (spinner) | | ✓ ✗ ? |
| Card changes color | Red (error) | | ✓ ✗ ? |
| Box name | None (empty) | | ✓ ✗ ? |
| Error message | "✗ Box not found in this project" | | ✓ ✗ ? |
| Form hidden | Yes | | ✓ ✗ ? |
| Rescan button visible | Yes | | ✓ ✗ ? |

**Conditional (if inventory_management):**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| "Add Box Manually" form appears | Yes (below error) | | ✓ ✗ ? |
| QR code pre-filled | Yes (with scanned code) | | ✓ ✗ ? |
| Can add box | Yes | | ✓ ✗ ? |

**Errors Encountered:**
- [ ] None
- [ ] [Describe error]

**Tester Notes:**
```
[Any observations]
```

---

### Test 4: Offline Scenario

**Status:** [ PASS / FAIL / BLOCKED ]

**Test Case ID:** TC-004  
**Scenario:** Network disabled, scan and confirm a box

**Preconditions Met:**
- [ ] Box TEST-BOX-002 exists and is in valid state for check_in
- [ ] DevTools available (F12)
- [ ] Can toggle offline mode

**Part A: Go Offline**

1. Open DevTools (F12) ✓
2. Network tab → Throttle → "Offline" (or turn off network) ✓
3. Refresh page ✓

**Observations (Offline):**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Offline banner appears | Yes ("⚠️ You are offline...") | | ✓ ✗ ? |
| Scanner page loads | Yes (cached/offline) | | ✓ ✗ ? |
| Can click "Open Scanner" | Yes | | ✓ ✗ ? |

**Part B: Scan While Offline**

1. Click "📱 Open Scanner" ✓
2. Scan QR code `TEST-BOX-002` ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Status card appears | No (requires network) | | ✓ ✗ ? |
| Form appears | Yes (immediately) | | ✓ ✗ ? |
| Condition selector | Yes (enabled) | | ✓ ✗ ? |
| Confirm button | Yes (enabled) | | ✓ ✗ ? |

**Part C: Confirm Offline**

1. Fill condition (select "👍 ok") ✓
2. Click "Confirm" ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| API call blocked | Yes (offline) | | ✓ ✗ ? |
| Success message | "Scan queued" (not error) | | ✓ ✗ ? |
| Message color | Green (success) | | ✓ ✗ ? |
| Queued count increments | "⚠️ 1 change queued" | | ✓ ✗ ? |
| Scanner reopens | Yes after 1.5s | | ✓ ✗ ? |
| IndexedDB stored | Entry in browser storage | | ✓ ✗ ? |

**Part D: Return Online**

1. DevTools → Network → "Online" ✓
2. Refresh page ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| Offline banner disappears | Yes | | ✓ ✗ ? |
| Queued count resets | "0" or disappears | | ✓ ✗ ? |
| Next scan works | Status card appears with spinner | | ✓ ✗ ? |
| API calls succeed | Network tab shows 200 responses | | ✓ ✗ ? |

**Errors Encountered:**
- [ ] None
- [ ] [Describe error]

**Tester Notes:**
```
[Any observations about offline sync]
```

---

### Test 5: Role-Based Denial

**Status:** [ PASS / FAIL / BLOCKED ]

**Test Case ID:** TC-005  
**Scenario:** User with `installation` role tries `check_in` action (should be disabled)

**Preconditions Met:**
- [ ] User has `installation` role in test project
- [ ] Or can switch to an installation user account
- [ ] Box exists in `expected` or `received` state

**Execution:**

1. Log in as / switch to `installation` user ✓
2. Navigate to `/scanner` ✓
3. Select test project ✓

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| "📥 Check In" button disabled | Yes (grayed out) | | ✓ ✗ ? |
| "📤 Check Out" button disabled | Yes (grayed out) | | ✓ ✗ ? |
| "⚡ Activate" button enabled | Yes | | ✓ ✗ ? |
| "↩️ Return" button enabled | Yes | | ✓ ✗ ? |

**Attempt Disabled Action (if possible to bypass):**

1. Open DevTools and enable check_in button ✓
2. Attempt to check_in a box ✓

**Expected:**
- [ ] Backend rejects with 403 "Your role does not allow this action"

**Observations:**

| Aspect | Expected | Actual | Match |
|--------|----------|--------|-------|
| API returns 403 | Yes | | ✓ ✗ ? |
| Error message shown | "Your role cannot perform this action" | | ✓ ✗ ? |

**Errors Encountered:**
- [ ] None
- [ ] [Describe error]

**Tester Notes:**
```
[Any observations about role enforcement]
```

---

## Summary

### Test Results Overview

| Test | Status | Notes |
|------|--------|-------|
| TC-001: Valid Transition (check_in) | [ PASS / FAIL ] | |
| TC-002: Invalid Transition (activate on departed) | [ PASS / FAIL ] | |
| TC-003: Box Not Found | [ PASS / FAIL ] | |
| TC-004: Offline Scenario | [ PASS / FAIL ] | |
| TC-005: Role-Based Denial | [ PASS / FAIL ] | |

### Overall Test Status

**Status:** [ ALL PASS / SOME FAILURES / BLOCKED ]

**Passed:** [ _ / 5 ]  
**Failed:** [ _ / 5 ]  
**Blocked:** [ _ / 5 ]

---

## Failures & Issues

### Critical Issues
```
[List any failures that prevent use]
```

### Non-Critical Issues
```
[List any non-blocking issues]
```

### Recommendations
```
[Any improvements for future testing]
```

---

## Sign-Off

**Tester Name:** ___________________________  
**Date:** ___________________________  
**Approved by:** ___________________________  

---

## Appendix

### Browser Console Errors

```
[Any JS errors encountered]
```

### Network Errors

```
[Any failed API calls]
```

### Database State

**Boxes after testing:**

```sql
SELECT 
  b.qr_code,
  b.label,
  (SELECT state FROM box_state_history WHERE box_id = b.id ORDER BY created_at DESC LIMIT 1) AS current_state,
  (SELECT COUNT(*) FROM box_state_history WHERE box_id = b.id) AS history_count
FROM boxes b
WHERE b.project_id = 'YOUR_PROJECT_ID'
ORDER BY b.qr_code;
```

**Result:**
```
[Paste output here]
```

### Performance Notes

- Scanner load time: _____ ms
- Preview endpoint response: _____ ms
- Scan confirmation response: _____ ms
- Offline sync time: _____ ms

---

**END OF REPORT**

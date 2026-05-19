# Quick Start: Manual Testing

**This document provides a streamlined way to run the manual tests for the QR scanner feature.**

---

## Prerequisites

- Dev server running: `npm run dev` ✓ (http://localhost:3000)
- Logged in via Google OAuth
- Test project created and test boxes set up

---

## TL;DR: Complete Test in 15 Minutes

### 1. Open Scanner Page

Navigate to **http://localhost:3000/scanner**

### 2. Create Test Boxes (if not already done)

If you don't have test boxes, create them using "Add Box Manually":

```
Mode: 📥 Check In
Click: ➕ Add Box Manually
QR Code: TEST-BOX-001
Description: Test Box 1
Click: Add and Check In
```

Repeat 3 more times with:
- TEST-BOX-002
- TEST-BOX-003
- TEST-BOX-404

### 3. Run Tests (Copy-Paste Each)

#### Test 1: Valid check_in (2 min)

```
Mode: 📥 Check In
Scan: TEST-BOX-002
Expected: Green card with "Ready to check_in"
Condition: 👍 ok
Click: Confirm
Expected: Success message, box is now "received"
Result: PASS [ ] FAIL [ ]
```

#### Test 2: Invalid activate (2 min)

```
First, transition TEST-BOX-003 to "in_use":
  Mode: ⚡ Activate
  Scan: TEST-BOX-003
  Click: Confirm

Then try invalid action:
  Mode: ⚡ Activate
  Scan: TEST-BOX-003
Expected: Red card with "Box is in state in_use — cannot activate"
Result: PASS [ ] FAIL [ ]
```

#### Test 3: Box not found (1 min)

```
Mode: 📥 Check In
Manual entry: NONEXISTENT-QR-CODE
Expected: Red card with "Box not found in this project"
Result: PASS [ ] FAIL [ ]
```

#### Test 4: Offline (3 min)

```
DevTools (F12) → Network → Offline
Scan: TEST-BOX-004
Fill: Condition = 👍 ok
Click: Confirm
Expected: Message "Scan queued" (green, not red)
DevTools → Network → Online
Expected: Offline banner disappears
Result: PASS [ ] FAIL [ ]
```

#### Test 5: Role check (2 min)

```
(If you have an installation user to test with)
Mode buttons: 📥 Check In should be DISABLED (grayed)
Expected: Button is grayed out
Result: PASS [ ] FAIL [ ]
(Or: BLOCKED - no installation user available)
```

---

## Detailed Guides

For more details on each test, see:
- **Full testing guide:** `TESTING_MANUAL_GUIDE.md`
- **Test data setup:** `TEST_DATA_SETUP.md`
- **Detailed report template:** `MANUAL_TESTING_REPORT.md`

---

## Common Issues

| Issue | Fix |
|-------|-----|
| "Box not found" | Create box first with "Add Box Manually" |
| Camera not working | Use localhost (not 127.0.0.1), check browser permissions |
| Status card stuck loading | Check DevTools Network tab for `/api/boxes/preview` errors |
| Offline mode not working | Use real offline (unplug ethernet) or check Network tab |

---

## Fill In Results

Once you've completed the 5 tests, fill in the summary:

```
Test 1 (Valid check_in): [ PASS / FAIL ]
Test 2 (Invalid activate): [ PASS / FAIL ]
Test 3 (Box not found): [ PASS / FAIL ]
Test 4 (Offline): [ PASS / FAIL ]
Test 5 (Role check): [ PASS / FAIL ]

Overall Status: [ ALL PASS / SOME FAILURES / BLOCKED ]
```

---

## Next Steps

- **If ALL PASS:** Feature is ready for integration testing
- **If SOME FAILURES:** Document issues and debug
- **If BLOCKED:** Check prerequisites (test data, permissions, etc.)

For full results, use `MANUAL_TESTING_REPORT.md`.

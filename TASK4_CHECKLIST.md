# Task 4 Manual Testing - Executive Checklist

**Date:** 2026-05-19  
**Status:** Ready for Execution

---

## Pre-Testing Setup

- [x] Dev server running (http://localhost:3000)
- [x] Server responds to requests (HTTP 200)
- [ ] Logged in via Google OAuth
- [ ] Test project created
- [ ] At least 4 test boxes created
- [ ] User has correct role(s) in project

---

## Documentation Prepared

- [x] TESTING_INDEX.md — Navigation guide
- [x] TESTING_QUICK_START.md — 15-min fast test
- [x] TESTING_MANUAL_GUIDE.md — Full reference
- [x] TEST_DATA_SETUP.md — Create test data
- [x] MANUAL_TESTING_REPORT.md — Record results
- [x] TASK4_COMPLETION_SUMMARY.md — Project overview

---

## Test Execution Checklist

### Test 1: Valid Transition (check_in on expected box)

**Estimated Time:** 5 minutes

- [ ] Box TEST-BOX-001 exists in "expected" state
- [ ] User has inventory_management or admin role
- [ ] Scanner mode set to "📥 Check In"
- [ ] Scan QR code or manual entry
- [ ] Verify status card is GREEN
- [ ] Verify message: "Ready to check_in"
- [ ] Verify form appears (condition, notes, photos)
- [ ] Select condition and confirm
- [ ] Verify success message appears
- [ ] Verify box state is now "received" in database
- **Result:** [ ] PASS [ ] FAIL

### Test 2: Invalid Transition (activate on departed box)

**Estimated Time:** 5 minutes

- [ ] Box TEST-BOX-404 exists in "departed" state
- [ ] User has installation or admin role
- [ ] Scanner mode set to "⚡ Activate"
- [ ] Scan QR code
- [ ] Verify status card is RED
- [ ] Verify error message contains "departed"
- [ ] Verify form is hidden
- [ ] Verify only "Rescan" button visible
- [ ] Click rescan and verify scanner reopens
- **Result:** [ ] PASS [ ] FAIL

### Test 3: Box Not Found

**Estimated Time:** 3 minutes

- [ ] Scanner open, project selected
- [ ] Enter or scan non-existent QR code (e.g., "NONEXISTENT-QR")
- [ ] Verify status card is RED
- [ ] Verify error: "Box not found in this project"
- [ ] Verify form is hidden
- [ ] Verify only "Rescan" button visible
- [ ] (If inventory_management role) Verify "Add Box Manually" form appears
- **Result:** [ ] PASS [ ] FAIL

### Test 4: Offline Mode

**Estimated Time:** 5 minutes

- [ ] Open DevTools (F12)
- [ ] Toggle Network to "Offline"
- [ ] Reload page (should load from cache)
- [ ] Verify offline banner appears
- [ ] Scan a box
- [ ] Verify NO status card appears (expected for offline)
- [ ] Verify form appears immediately
- [ ] Fill in condition and click Confirm
- [ ] Verify message "Scan queued" (green, not error)
- [ ] Verify offline counter increments (e.g., "1 change queued")
- [ ] Toggle Network back to "Online"
- [ ] Verify offline banner disappears
- [ ] Verify counter resets
- [ ] Scan another box and verify normal behavior resumes
- **Result:** [ ] PASS [ ] FAIL [ ] BLOCKED

### Test 5: Role-Based Access Control

**Estimated Time:** 3 minutes

- [ ] Switch to / log in as installation user (or note if unavailable)
- [ ] Navigate to /scanner
- [ ] Verify "📥 Check In" button is DISABLED (grayed out)
- [ ] Verify "📤 Check Out" button is DISABLED (grayed out)
- [ ] Verify "⚡ Activate" button is ENABLED
- [ ] Verify "↩️ Return" button is ENABLED
- (Optional) Attempt to bypass UI and test API returns 403
- **Result:** [ ] PASS [ ] FAIL [ ] BLOCKED (no installation user)

---

## Overall Test Status

After completing all 5 tests, determine overall status:

### Test Results Summary

| Test | Status |
|------|--------|
| Test 1: Valid check_in | [ ] PASS [ ] FAIL |
| Test 2: Invalid activate | [ ] PASS [ ] FAIL |
| Test 3: Box not found | [ ] PASS [ ] FAIL |
| Test 4: Offline mode | [ ] PASS [ ] FAIL [ ] BLOCKED |
| Test 5: Role-based ACL | [ ] PASS [ ] FAIL [ ] BLOCKED |

### Overall Result

Choose one:

- [ ] **ALL PASS** — All 5 tests passed. Feature is ready for integration testing.
- [ ] **SOME FAILURES** — Some tests failed. Document issues in MANUAL_TESTING_REPORT.md and debug.
- [ ] **BLOCKED** — Cannot complete tests due to missing prerequisites (test data, permissions, etc.).

---

## Issues Found

If any test failed or was blocked, document here:

```
Test Name: _____________________________
Expected Behavior: _____________________________
Actual Behavior: _____________________________
Error Message: _____________________________
Steps to Reproduce: _____________________________
Severity: [ ] Critical [ ] Major [ ] Minor
```

---

## Sign-Off

**Tester Name:** ___________________________

**Date:** ___________________________

**Overall Status:** [ ] ALL PASS [ ] FAILURES [ ] BLOCKED

**Approval:** ___________________________

**Comments:**
```
[Any notes or observations]
```

---

## Files for Reference

| File | Purpose |
|------|---------|
| TESTING_INDEX.md | Navigation guide |
| TESTING_QUICK_START.md | Fast test (use this!) |
| TESTING_MANUAL_GUIDE.md | Detailed reference |
| TEST_DATA_SETUP.md | Create test data |
| MANUAL_TESTING_REPORT.md | Detailed results |
| TASK4_COMPLETION_SUMMARY.md | Project overview |

---

## Next Steps

### If ALL PASS

✓ Feature is complete and ready for:
- Integration testing with multiple users
- Performance testing
- Security review (if applicable)
- Deployment planning

### If SOME FAILURES

1. Document each failure in MANUAL_TESTING_REPORT.md
2. Check DevTools (F12) for errors:
   - Network tab: API call responses
   - Console tab: JavaScript errors
   - Application tab: Storage/IndexedDB
3. Review server logs (npm run dev terminal)
4. Debug and fix issues
5. Re-run failed tests
6. Update checklist

### If BLOCKED

1. Resolve blockers (test data, permissions, network access)
2. Review TEST_DATA_SETUP.md for help
3. Retry tests once blockers are resolved

---

## Quick Reference

**Dev Server:** http://localhost:3000  
**Scanner Page:** http://localhost:3000/scanner  
**DevTools:** F12 or Ctrl+Shift+I  
**Database CLI:** psql $DATABASE_URL  

---

## Success = Ready for Integration Testing

Once all tests pass, the feature is ready for:
1. Multi-user integration testing (WebSocket events)
2. Real-world scenario testing (box lifecycle)
3. Performance benchmarking
4. Security review
5. Deployment

---

**Last Updated:** 2026-05-19  
**Status:** Ready for Execution

---

Start testing: Open `TESTING_QUICK_START.md` or this checklist and follow the steps above.

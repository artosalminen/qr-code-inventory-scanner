# Task 4: Manual Testing - Completion Summary

**Date:** 2026-05-19  
**Task:** Manual testing of the QR code scanner feature (valid transitions, invalid transitions, error handling, offline mode, role-based access control)

---

## Task Overview

**Objective:** Test the QR code scanner feature end-to-end across multiple scenarios:
1. Valid state transitions (check_in on expected box)
2. Invalid state transitions (activate on departed box)
3. Error scenarios (box not found)
4. Offline mode (queueing scans when network is down)
5. Role-based access control (permission enforcement)

**Status:** Ready for Manual Execution

---

## Implementation Complete

### Core Implementation (Tasks 1-3)

| Component | Status | File |
|-----------|--------|------|
| API Endpoint (scan/preview) | ✓ | `/src/pages/api/boxes/scan.ts`, `/src/pages/api/boxes/preview.ts` |
| State Machine Logic | ✓ | `/src/lib/state-machine.ts` |
| UI Components | ✓ | `/src/pages/scanner.tsx` |
| Offline Support | ✓ | `/src/lib/scan-queue.ts`, `/hooks/useOnlineStatus.ts` |
| Error Handling | ✓ | Various endpoints + UI feedback |

### Testing Artifacts Created (Task 4)

| Document | Purpose | Link |
|----------|---------|------|
| TESTING_QUICK_START.md | Fast 15-min test guide | Start here |
| TESTING_MANUAL_GUIDE.md | Detailed 6-step test plan | Full reference |
| TEST_DATA_SETUP.md | Create test data | Prerequisites |
| MANUAL_TESTING_REPORT.md | Record results | Document findings |
| TASK4_COMPLETION_SUMMARY.md | This document | Summary |

---

## Pre-Execution Checklist

Before starting manual tests, verify:

- [ ] Dev server running: `npm run dev`
- [ ] Server is accessible: http://localhost:3000
- [ ] Logged in via Google OAuth
- [ ] At least one project exists
- [ ] At least 4 test boxes created (in different states, or ready to transition)
- [ ] User has roles in the project (inventory_management, installation, or admin)

### Quick Server Check

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Verify server is running
curl http://localhost:3000/api/projects
# Should return projects JSON (after login)
```

---

## Test Execution Plan

### Duration: ~30 minutes

| Test | Duration | Status |
|------|----------|--------|
| **Setup:** Create test data | 5 min | [ ] |
| **Test 1:** Valid transition (check_in) | 5 min | [ PASS / FAIL ] |
| **Test 2:** Invalid transition (activate on departed) | 5 min | [ PASS / FAIL ] |
| **Test 3:** Box not found | 3 min | [ PASS / FAIL ] |
| **Test 4:** Offline scenario | 5 min | [ PASS / FAIL ] |
| **Test 5:** Role-based denial | 3 min | [ PASS / FAIL ] |
| **Total** | ~30 min | [ ALL PASS / FAILURES ] |

---

## Key Test Scenarios

### Test 1: Valid Transition (check_in)

**Description:** User with inventory_management role scans box in "expected" state and transitions it to "received"

**Entry Criteria:**
- Box in "expected" state (no state history)
- User has inventory_management or admin role
- Scanner mode is "check_in"

**Exit Criteria:**
- Status card shows green "Ready to check_in"
- Form displays (condition, notes, photos)
- Confirmation successful
- Box state in database is now "received"
- Success message appears

**Expected Result:** PASS

---

### Test 2: Invalid Transition (activate on departed)

**Description:** User attempts to activate a box that's already departed (state conflict)

**Entry Criteria:**
- Box in "departed" state
- User has installation role
- Scanner mode is "activate"

**Exit Criteria:**
- Status card shows red with error message
- Error indicates state conflict
- Form is hidden
- Only Rescan button visible

**Expected Result:** PASS

---

### Test 3: Box Not Found

**Description:** Scan a QR code that doesn't exist in the project

**Entry Criteria:**
- Any valid project selected
- QR code doesn't exist in database

**Exit Criteria:**
- Red error card shows "Box not found"
- No box name displayed
- If user has inventory_management role: "Add Box Manually" form appears

**Expected Result:** PASS

---

### Test 4: Offline Mode

**Description:** Network is disabled; user scans and queues a scan offline; network restored; scan auto-syncs

**Entry Criteria:**
- Network manually disabled (DevTools offline)
- Valid box ready to scan

**Exit Criteria:**
- Offline banner appears
- Scan can be completed (no status card shown)
- Confirmation shows "Scan queued" (not error)
- Queued count increments
- When network restored, scan auto-syncs
- Next scan works normally

**Expected Result:** PASS

---

### Test 5: Role-Based Denial

**Description:** User with installation role cannot perform inventory_management actions (check_in/check_out)

**Entry Criteria:**
- User has installation role
- Viewing scanner page

**Exit Criteria:**
- "Check In" button is disabled (grayed out)
- "Check Out" button is disabled
- "Activate" and "Return" buttons are enabled
- Backend enforces permissions (403 if bypassed)

**Expected Result:** PASS (or BLOCKED if no installation user)

---

## Testing Artifacts Reference

### Quick Start Guide

**File:** `TESTING_QUICK_START.md`

Fast 15-minute test execution:
- Copy-paste test steps
- Fill in PASS/FAIL results
- Done

### Detailed Guide

**File:** `TESTING_MANUAL_GUIDE.md`

Comprehensive reference with:
- State machine quick reference
- Detailed step-by-step instructions
- Expected observations for each step
- Troubleshooting section
- Common issues and solutions

### Test Data Setup

**File:** `TEST_DATA_SETUP.md`

How to create test data:
- Via UI (Add Box Manually)
- Via API (curl commands)
- Via Database (SQL inserts)
- State transitions explained

### Detailed Report

**File:** `MANUAL_TESTING_REPORT.md`

Document test results:
- 5 detailed test case forms
- Observation checklists
- Pass/fail tracking
- Issue documentation
- Sign-off section

---

## Expected Outcomes

### All Tests Pass

If all 5 tests PASS:
- Scanner feature is working as designed
- State machine transitions are correct
- Error handling is functional
- Offline mode works
- Role-based access control is enforced
- Feature ready for integration testing

### Some Tests Fail

If any tests fail:
1. Document the exact failure in the report
2. Check if it's a blocker or minor issue
3. Debug using troubleshooting guides
4. Fix and re-test
5. Update report with resolution

### Blocked Tests

If tests are blocked (e.g., no test data available):
1. Document the blocker
2. Work through prerequisites
3. Retry tests once blocker is resolved

---

## Verification Checklist

After completing all 5 tests, verify:

- [ ] All test results documented in `MANUAL_TESTING_REPORT.md`
- [ ] Any failures explained with error details
- [ ] Database state checked (box states match expectations)
- [ ] No console errors in DevTools
- [ ] No failed API calls in Network tab
- [ ] Offline mode tested (if applicable)
- [ ] Role-based access tested (if applicable)
- [ ] Sign-off completed on report

---

## Success Criteria

### All Tests Must Pass

- TC-001: Valid transition (check_in) — PASS
- TC-002: Invalid transition (activate on departed) — PASS
- TC-003: Box not found — PASS
- TC-004: Offline scenario — PASS (or BLOCKED if network unavailable)
- TC-005: Role-based denial — PASS (or BLOCKED if installation user unavailable)

### Success Conditions

- Feature works as designed per specification
- Error messages are clear and actionable
- State machine prevents invalid transitions
- Offline mode queues scans correctly
- Permissions are enforced at API level
- No critical bugs blocking usage

---

## Known Limitations (Not Test Failures)

These are NOT test failures, just limitations documented in the spec:

- **Offline photos:** Photos cannot be queued offline (will warn user)
- **WebSocket events:** Real-time sync requires separate multi-user testing
- **Location tracking:** System doesn't track WHERE boxes are (spec requirement)
- **Item-level tracking:** Boxes are atomic (no individual item QR codes in MVP)

---

## Next Steps After Testing

### If All Tests Pass

1. Close Task 4 (manual testing complete)
2. Begin Task 5+ (if any):
   - Integration testing with multiple users
   - Performance testing
   - Security review
   - Deployment

### If Tests Fail

1. Analyze failures
2. Debug with DevTools (Network, Console)
3. Check server logs
4. Review API responses
5. Fix bugs
6. Re-test

### Documentation

- Update CLAUDE.md if any implementation details changed
- Archive test results for future reference
- Document any workarounds or known issues

---

## Test Execution Instructions

### Step 1: Prepare

```bash
# Ensure dev server is running
npm run dev
# Should show: ▲ Next.js ready - started server on 0.0.0.0:3000
```

### Step 2: Navigate to Testing Docs

Open this directory in your editor:
```
C:\repos\slmnn\qr-code-inventory\
```

Read in order:
1. `TESTING_QUICK_START.md` (overview)
2. `TEST_DATA_SETUP.md` (create test data if needed)
3. `TESTING_MANUAL_GUIDE.md` (detailed steps)
4. `MANUAL_TESTING_REPORT.md` (record results)

### Step 3: Execute Tests

Follow steps in `TESTING_QUICK_START.md` or `TESTING_MANUAL_GUIDE.md`

### Step 4: Document Results

Fill in `MANUAL_TESTING_REPORT.md` with:
- Test status (PASS/FAIL/BLOCKED)
- Observations
- Any errors or issues
- Sign-off

### Step 5: Verify

Check database state:
```bash
# Connect to database
psql $DATABASE_URL

# Check box states
SELECT qr_code, state FROM boxes 
  JOIN box_state_history ON boxes.id = box_state_history.box_id 
  WHERE project_id = 'YOUR_PROJECT_ID' 
  ORDER BY box_state_history.created_at DESC;
```

---

## Support & Troubleshooting

### Issue: Can't create test data

**Solution:** Follow `TEST_DATA_SETUP.md` for alternative methods (API, database)

### Issue: "Box not found" error on valid box

**Solution:** Verify box exists in the right project: Check database or ensure you created it in the selected project

### Issue: Scanner camera not working

**Solution:** Use localhost (not 127.0.0.1), check browser permissions, ensure HTTPS (localhost is exempt)

### Issue: Status card stuck loading

**Solution:** Check Network tab for `/api/boxes/preview` errors, verify server logs

### Issue: Can't go offline

**Solution:** Use real offline (unplug ethernet) or airplane mode; DevTools "Offline" mode sometimes unreliable

---

## Sign-Off

Once all testing is complete, have the tester sign off:

**Tester Name:** ___________________________  
**Date:** ___________________________  
**Test Status:** [ ALL PASS / SOME FAILURES / BLOCKED ]

---

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| TESTING_QUICK_START.md | Fast 15-min test guide | Ready |
| TESTING_MANUAL_GUIDE.md | Full reference with all steps | Ready |
| TEST_DATA_SETUP.md | Create test data | Ready |
| MANUAL_TESTING_REPORT.md | Record detailed results | Ready |
| TASK4_COMPLETION_SUMMARY.md | This summary | Ready |

---

**End of Summary**

For detailed information, refer to the individual testing documents listed above.

Last Updated: 2026-05-19  
Status: Ready for Execution

# Testing Documentation Index

**Last Updated:** 2026-05-19  
**Task:** Task 4 - Manual Testing of QR Code Scanner Feature

---

## Quick Navigation

### Start Here

**New to testing?** Begin with one of these:

1. **Fast Test (15 min):** `TESTING_QUICK_START.md` — Copy-paste test steps, fill in PASS/FAIL
2. **Full Test (30 min):** `TESTING_MANUAL_GUIDE.md` — Detailed guide with all steps
3. **Setup Help:** `TEST_DATA_SETUP.md` — Create test data if needed

### For Testers

- **Quick Start Guide:** `TESTING_QUICK_START.md`
  - 15-minute end-to-end test
  - Copy-paste test scenarios
  - Simple PASS/FAIL checkmarks

- **Detailed Manual Guide:** `TESTING_MANUAL_GUIDE.md`
  - Full reference with all test cases
  - Step-by-step instructions
  - Observations checklists
  - Troubleshooting guide

- **Test Data Setup:** `TEST_DATA_SETUP.md`
  - How to create test boxes
  - API commands (curl)
  - Database setup (SQL)
  - State machine transitions

### For Documentation

- **Detailed Report:** `MANUAL_TESTING_REPORT.md`
  - Blank form to fill in test results
  - Detailed observation checklists
  - Issue documentation
  - Sign-off section

- **Summary:** `TASK4_COMPLETION_SUMMARY.md`
  - Test overview
  - Execution checklist
  - Success criteria
  - Next steps

---

## Test Coverage

### 5 Test Cases

1. **Valid Transition (check_in)**
   - Box in `expected` state, user has inventory_management role
   - Expected: Green status card, form appears, confirmation succeeds
   - Document: `TESTING_MANUAL_GUIDE.md` Step 2

2. **Invalid Transition (activate on departed)**
   - Box in `departed` state, user tries `activate` action
   - Expected: Red error card, form hidden, only rescan visible
   - Document: `TESTING_MANUAL_GUIDE.md` Step 3

3. **Box Not Found**
   - Scan QR code that doesn't exist in project
   - Expected: Red error card with "Box not found"
   - Document: `TESTING_MANUAL_GUIDE.md` Step 4

4. **Offline Mode**
   - Network disabled, scan and confirm
   - Expected: Scan queued (not errored), auto-syncs when online
   - Document: `TESTING_MANUAL_GUIDE.md` Step 5

5. **Role-Based Access Control**
   - User with `installation` role tries `check_in` action
   - Expected: Button disabled in UI, API returns 403 if bypassed
   - Document: `TESTING_MANUAL_GUIDE.md` Step 6

---

## How to Use This Documentation

### Option A: Quick Test (15 minutes)

1. Open `TESTING_QUICK_START.md`
2. Follow the copy-paste test steps
3. Mark each test as PASS or FAIL
4. Done!

### Option B: Detailed Test (30 minutes)

1. Open `TESTING_MANUAL_GUIDE.md`
2. Follow each step carefully
3. Compare your observations to expected outcomes
4. Open `MANUAL_TESTING_REPORT.md` to document results
5. Fill in detailed findings and sign off

### Option C: First Time Setup

1. Open `TEST_DATA_SETUP.md`
2. Create test project and boxes
3. Then proceed with Option A or B

---

## Pre-Test Checklist

Before starting any tests, verify:

```
[ ] Dev server running: npm run dev
[ ] Server accessible: http://localhost:3000
[ ] Logged in via Google OAuth
[ ] Test project exists (or follow TEST_DATA_SETUP.md)
[ ] At least 4 test boxes created
[ ] User has role in project (inventory_management, installation, or admin)
```

---

## Success Criteria

### All 5 Tests Must Pass

| Test | Expected Result |
|------|-----------------|
| TC-001: Valid check_in | PASS |
| TC-002: Invalid activate | PASS |
| TC-003: Box not found | PASS |
| TC-004: Offline mode | PASS |
| TC-005: Role-based denial | PASS (or BLOCKED) |

### Failure Criteria

- Any test returning FAIL requires documentation and debugging
- BLOCKED tests need workaround or skip explanation
- ALL PASS = feature is ready for integration testing

---

## Document Descriptions

### TESTING_QUICK_START.md

**Purpose:** Fast 15-minute test execution  
**Audience:** Testers who want to test quickly  
**Format:** Copy-paste test steps with simple PASS/FAIL checkboxes  
**Time:** 15 minutes  

### TESTING_MANUAL_GUIDE.md

**Purpose:** Complete reference for manual testing  
**Audience:** QA testers, developers, product team  
**Format:** Detailed steps, observations checklists, troubleshooting  
**Time:** 30 minutes (or more for debugging)  
**Sections:**
- Setup instructions
- State machine reference
- 6 detailed test steps (Step 2-6 from original task)
- Troubleshooting guide
- Test summary checklist

### TEST_DATA_SETUP.md

**Purpose:** Create test data for manual testing  
**Audience:** Testers who don't have test data yet  
**Format:** Step-by-step UI guide, API commands, SQL queries  
**Methods:**
- UI method (Add Box Manually)
- API method (curl commands)
- Database method (SQL inserts)

### MANUAL_TESTING_REPORT.md

**Purpose:** Document detailed test results  
**Audience:** QA leads, documentation, sign-off  
**Format:** Blank form with checklists for each test case  
**Contents:**
- Test status (PASS/FAIL/BLOCKED)
- Detailed observations
- Error documentation
- Sign-off section
- Appendix with browser/network logs

### TASK4_COMPLETION_SUMMARY.md

**Purpose:** Overview of Task 4 (manual testing)  
**Audience:** Project managers, technical leads  
**Format:** Executive summary with checklists  
**Contents:**
- Task overview
- Implementation status
- Test execution plan
- Success criteria
- Next steps

### TESTING_INDEX.md

**Purpose:** Navigation guide for testing documentation  
**Audience:** Everyone  
**Format:** This document  
**Contents:** Links and descriptions of all testing docs

---

## Common Scenarios

### Scenario 1: I'm a tester with no experience

1. Read `TESTING_QUICK_START.md` (5 min)
2. Follow `TEST_DATA_SETUP.md` if needed (5 min)
3. Execute tests from `TESTING_QUICK_START.md` (15 min)
4. Fill in quick results
5. Done!

**Total Time:** 25 minutes

### Scenario 2: I need detailed documentation

1. Read `TESTING_MANUAL_GUIDE.md` (10 min read)
2. Follow `TEST_DATA_SETUP.md` if needed (5 min)
3. Execute each test step carefully (20 min)
4. Fill in `MANUAL_TESTING_REPORT.md` (5 min)
5. Document any issues

**Total Time:** 40 minutes

### Scenario 3: Tests are failing, I need to debug

1. Review `TESTING_MANUAL_GUIDE.md` Step 1-6 (identify which test is failing)
2. Check `TESTING_MANUAL_GUIDE.md` Troubleshooting section
3. Use DevTools (F12) → Network tab to inspect API calls
4. Check browser console for JS errors
5. Review server logs: `npm run dev` terminal
6. Document error in `MANUAL_TESTING_REPORT.md`

### Scenario 4: Test data doesn't exist

1. Open `TEST_DATA_SETUP.md`
2. Choose method:
   - UI method (easiest): Use "Add Box Manually" in scanner
   - API method: curl commands provided
   - Database method: SQL queries provided
3. Create 4 test boxes
4. Transition them to different states (follow instructions)
5. Return to testing

**Total Time:** 10 minutes

---

## File Locations

All testing documents are in the project root:

```
C:\repos\slmnn\qr-code-inventory\
├── TESTING_INDEX.md                   ← You are here
├── TESTING_QUICK_START.md             ← Start here (15 min)
├── TESTING_MANUAL_GUIDE.md            ← Full reference (30 min)
├── TEST_DATA_SETUP.md                 ← Setup test data
├── MANUAL_TESTING_REPORT.md           ← Record results
└── TASK4_COMPLETION_SUMMARY.md        ← Project overview
```

---

## Testing Environment

**Dev Server:** http://localhost:3000  
**Start Command:** `npm run dev`  
**Database:** Azure SQL (from .env.local)  
**Browser:** Any modern browser (Chrome, Firefox, Edge, Safari)  

---

## Key Concepts

### Box States

- `expected` — Initial state (no history entry)
- `received` — Checked in by inventory
- `in_use` — Activated by installation
- `ready_for_checkout` — Returned by installation
- `departed` — Checked out by inventory

### Valid Transitions

```
expected → received (check_in) [inventory_management, admin]
received → in_use (activate) [all roles except read_only]
in_use → ready_for_checkout (return) [installation, admin]
ready_for_checkout → departed (check_out) [inventory_management, admin]
received → departed (check_out) [inventory_management, admin] [direct]
received → received (check_in) [inventory_management, admin] [re-check]
```

### User Roles

- `admin` — Full access, can manage projects and users
- `inventory_management` — Can check-in and check-out boxes
- `installation` — Can activate and return boxes
- `read_only` — Can only view, no actions

---

## FAQ

### Q: How long does testing take?

A: 15 minutes (quick) to 30+ minutes (detailed with troubleshooting)

### Q: Do I need test data?

A: Yes. See `TEST_DATA_SETUP.md` (5 min setup)

### Q: What if tests fail?

A: Document in `MANUAL_TESTING_REPORT.md` and check troubleshooting section

### Q: Do I need multiple user accounts?

A: Only for Test 5 (role-based). Can skip if not available.

### Q: Can I test offline?

A: Yes! See Test 4 in `TESTING_MANUAL_GUIDE.md`

### Q: What if I get "Box not found"?

A: Follow `TEST_DATA_SETUP.md` to create boxes

### Q: How do I check database state?

A: See `TESTING_MANUAL_GUIDE.md` Troubleshooting section

### Q: Where are API errors shown?

A: DevTools (F12) → Network tab, or browser console

---

## Support

### Stuck on test setup?

See: `TEST_DATA_SETUP.md` → Troubleshooting

### Need detailed step-by-step?

See: `TESTING_MANUAL_GUIDE.md`

### Want to document findings?

See: `MANUAL_TESTING_REPORT.md`

### Need quick reference?

See: `TESTING_QUICK_START.md`

---

## Next Steps After Testing

- **All Pass:** Feature is ready for integration testing
- **Some Fail:** Debug and fix, then re-test
- **Blocked:** Resolve blockers (test data, permissions, etc.)

---

**Start Testing:** Open `TESTING_QUICK_START.md` →

# Test Data Setup for Manual Testing

## Quick Start

**Goal:** Create a test project with boxes in various states for manual testing.

## Prerequisites

1. Dev server running: `npm run dev` (should be on http://localhost:3000)
2. You must be logged in via Google OAuth
3. You need a database connection (DATABASE_URL in .env.local)

## Steps

### 1. Log In

Navigate to http://localhost:3000 and click "Sign in with Google". You will be redirected to Google OAuth flow and then back to the dashboard.

### 2. Create a Test Project

Navigate to http://localhost:3000/api/projects directly or use a test API client.

**Using curl** (after logging in):

```bash
# Note: You'll need to extract the sessionToken cookie from your browser
# In DevTools → Application → Cookies, find the value of `next-auth.session-token`

curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN_HERE" \
  -d '{
    "name": "Manual Test Project",
    "description": "Testing QR scanner with various box states"
  }'
```

The response will include `id` — copy this for the next steps.

### 3. Create Test Boxes

Use the scanner page's "Add Box Manually" feature if you have `inventory_management` role:

1. Navigate to `/scanner`
2. Select your test project
3. Ensure scan mode is "📥 Check In"
4. Scroll down and click "➕ Add Box Manually"
5. Fill in:
   - QR Code: `TEST-BOX-001` (or any unique value)
   - Description: `Test Box 1` (optional)
6. Click "Add and Check In"

This creates the box and immediately transitions it to `received` state.

**Repeat 3-4 times with different QR codes:**
- `TEST-BOX-001` → state: `received`
- `TEST-BOX-002` → state: `received`
- `TEST-BOX-003` → state: `received`
- `TEST-BOX-404` → state: `received`

### 4. Create Boxes in Other States

You now have 4 boxes in `received` state. To create boxes in other states, use the scanner in sequence:

#### Box 2 → `in_use` state:

1. Change scanner mode to "⚡ Activate"
2. Scan `TEST-BOX-002`
3. Click "Confirm"
4. Box is now `in_use`

#### Box 3 → `ready_for_checkout` state:

1. First activate it: mode "⚡ Activate", scan `TEST-BOX-003`, confirm
2. Then return it: mode "↩️ Return", scan `TEST-BOX-003`, confirm
3. Box is now `ready_for_checkout`

#### Box 4 → `departed` state:

1. First activate it: mode "⚡ Activate", scan `TEST-BOX-404`, confirm
2. Then return it: mode "↩️ Return", scan `TEST-BOX-404`, confirm
3. Then check out: mode "📤 Check Out", scan `TEST-BOX-404`, confirm
4. Box is now `departed`

#### Box 1 → `departed` (direct):

1. Mode "📤 Check Out", scan `TEST-BOX-001`
2. Click confirm
3. Box transitions directly from `received` to `departed`

### Summary

After these steps, you'll have:

| QR Code | State | Transition Path |
|---------|-------|-----------------|
| TEST-BOX-001 | `departed` | expected → received → departed |
| TEST-BOX-002 | `in_use` | expected → received → in_use |
| TEST-BOX-003 | `ready_for_checkout` | expected → received → in_use → ready_for_checkout |
| TEST-BOX-404 | `departed` | expected → received → in_use → ready_for_checkout → departed |

---

## Manual Testing Instructions

Once test data is set up, follow `TESTING_MANUAL_GUIDE.md` for the full test suite.

### Quick Test Commands

**Check box states in database:**

```bash
# Connect to your database (adjust for your DB client)
psql $DATABASE_URL

SELECT 
  b.qr_code,
  b.label,
  (SELECT state FROM box_state_history WHERE box_id = b.id ORDER BY created_at DESC LIMIT 1) AS current_state
FROM boxes b
WHERE b.project_id = 'YOUR_PROJECT_ID'
ORDER BY b.qr_code;
```

**Check scan history:**

```sql
SELECT 
  b.qr_code,
  bsh.state,
  bsh.condition,
  bsh.notes,
  u.email,
  bsh.created_at
FROM box_state_history bsh
JOIN boxes b ON bsh.box_id = b.id
JOIN users u ON bsh.state_set_by = u.id
WHERE b.project_id = 'YOUR_PROJECT_ID'
ORDER BY bsh.created_at DESC;
```

---

## Troubleshooting

### Issue: "Add Box Manually" button not visible

**Cause:** You don't have `inventory_management` or `admin` role in the project

**Solution:**
1. Create the project as the logged-in user (auto-assigns admin role)
2. Or ask an admin to assign you the role

### Issue: Scan confirmation fails with "Forbidden"

**Cause:** Your role doesn't allow the action

**Solution:**
- Verify your role: Check project users in the admin panel or DB
- Check state machine rules in `TESTING_MANUAL_GUIDE.md`

### Issue: Database connection fails

**Cause:** DATABASE_URL not set or invalid

**Solution:**
```bash
# Verify .env.local has DATABASE_URL
cat .env.local

# Test connection
npx prisma db execute --stdin < <(echo "SELECT 1")
```

---

## Alternative: Database-Level Setup (Advanced)

If the UI approach doesn't work, you can directly insert test data:

```sql
-- Create project
INSERT INTO projects (id, name, description, created_by, status)
VALUES ('test-proj-001', 'Manual Test Project', 'Test data', 'USER_ID', 'active');

-- Create project_users (assign yourself)
INSERT INTO project_users (project_id, user_id, role, assigned_by)
VALUES ('test-proj-001', 'USER_ID', 'admin', 'USER_ID');

-- Create boxes
INSERT INTO boxes (id, project_id, qr_code, label)
VALUES 
  ('box-001', 'test-proj-001', 'TEST-BOX-001', 'Test Box 1'),
  ('box-002', 'test-proj-001', 'TEST-BOX-002', 'Test Box 2'),
  ('box-003', 'test-proj-001', 'TEST-BOX-003', 'Test Box 3'),
  ('box-404', 'test-proj-001', 'TEST-BOX-404', 'Test Box 404');

-- Create state history (box-001: expected → received)
INSERT INTO box_state_history (id, box_id, state_set_by, state, change_type, created_at)
VALUES 
  ('hist-001', 'box-001', 'USER_ID', 'received', 'scanned', NOW()),
  ('hist-002', 'box-002', 'USER_ID', 'received', 'scanned', NOW()),
  ('hist-003', 'box-003', 'USER_ID', 'received', 'scanned', NOW()),
  ('hist-004', 'box-404', 'USER_ID', 'received', 'scanned', NOW());

-- (Optionally) Create state history for more states
-- box-002: received → in_use
INSERT INTO box_state_history (box_id, state_set_by, state, change_type, installation_user, created_at)
VALUES ('box-002', 'USER_ID', 'in_use', 'scanned', 'USER_ID', NOW() + interval '1 second');

-- etc.
```

Replace `USER_ID` with your actual user ID (check `SELECT * FROM users`).

---

**Note:** All test data should be in a dedicated test project to avoid interfering with production data.

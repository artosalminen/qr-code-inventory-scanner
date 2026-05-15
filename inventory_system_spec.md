# Inventory Management System - Technical Specification

**Project Name:** Real-Time Inventory Tracking & Handoff System  
**Version:** 1.0.0 (MVP)  
**Last Updated:** May 2026  
**Status:** Specification Phase

---

## 1. Executive Summary

This system provides real-time, role-based inventory tracking for equipment boxes during transit, use, and return cycles. It enables seamless handoffs between logistics (check-in/out) and installation teams via QR code scanning, with live dashboard visibility for supervisors.

**Key Features:**
- QR-based rapid scanning workflow
- Three-phase box lifecycle: check-in → in-use → check-out
- Role-based permissions (Admin, Inventory Management, Installation, Read-only)
- Real-time state synchronization across all active users
- Complete audit trail with timestamps and user attribution
- Live dashboard for inventory crew visibility

---

## 2. System Overview

### 2.1 Technology Stack

**Frontend:**
- Next.js (React framework)
- TypeScript
- TailwindCSS or similar CSS framework
- Responsive design (mobile-first for on-truck scanning)

**Backend:**
- Next.js API Routes
- TypeScript
- Real-time sync: WebSocket (Socket.io or similar)

**Authentication:**
- Google OAuth 2.0 (via NextAuth.js)
- SSO only — no password management

**Database:**
- Azure SQL Database (free offer tier)
- T-SQL relational schema for projects, users, boxes, state history
- Zero monthly cost with auto-pause when limits reached
- 100,000 vCore seconds/month + 32 GB storage free per subscription

**Deployment:**
- Azure App Service
- Azure SQL Database (free offer)
- Environments: staging, production

---

## 3. Authentication & Authorization

### 3.1 Login Flow

1. User lands on app → redirected to Google OAuth login page
2. User authenticates with Google account
3. System creates/updates user record in database with email and profile info
4. User is assigned to projects by admin
5. User session established (NextAuth.js)
6. User redirected to dashboard for their role

### 3.2 Roles & Permissions Matrix

| Permission | Admin | Inventory Mgmt | Installation | Read-only |
|-----------|-------|----------------|--------------|-----------|
| Upload CSV | ✓ | ✗ | ✗ | ✗ |
| Set default QR mode | ✓ | ✗ | ✗ | ✗ |
| Check-in boxes (via QR scan) | ✓ | ✓ | ✗ | ✗ |
| Activate box (via QR scan) | ✓ | ✗ | ✓ | ✗ |
| Return box (via QR scan) | ✓ | ✗ | ✓ | ✗ |
| Check-out boxes (via QR scan) | ✓ | ✓ | ✗ | ✗ |
| Manually change any box state (override) | ✓ | ✓ | ✗ | ✗ |
| View live project state | ✓ | ✓ | ✓ | ✓ |
| Edit user roles (project) | ✓ | ✗ | ✗ | ✗ |

### 3.3 Role Definitions

**Admin**
- Manages projects (create, configure)
- Uploads CSV inventory data
- Sets default QR scanning mode (check-in or check-out)
- Assigns users to projects with specific roles
- Has full permissions on all project operations

**Inventory Management**
- Scans boxes during arrival (check-in): logs condition, broken items, notes
- Scans boxes during departure (check-out): logs final condition, notes
- Cannot activate boxes (Installation team only)
- Can manually override any box state via admin panel (with free-text reason/details, no user assignment)
- Uses QR default mode set by admin (check-in or check-out) but can override per scan
- Can resolve stuck boxes (e.g., IN-USE → READY_FOR_CHECKOUT if Installation user disappeared)
- Views real-time inventory state

**Installation**
- Scans boxes to activate (marks IN-USE under their name)
- Must manually select scan mode (Activate or Return) — no default mode
- Uses boxes on site (can log usage notes if needed)
- Scans boxes to mark RETURNED (transitions to READY_FOR_CHECKOUT)
- Cannot check-in, check-out, or manually override states
- Views real-time inventory state

**Read-only**
- Views live inventory dashboard (color-coded box states)
- Cannot scan, edit, or modify any data
- For supervisors, managers, quality control observers

---

## 4. Data Model

### 4.1 Core Entities

**Project**
```
- id: UUID (primary key)
- name: string (e.g., "Warehouse Shipment #42")
- description: text (optional)
- csv_uploaded_at: timestamp
- default_qr_mode: enum ["check-in", "check-out"]
- status: enum ["active", "archived"] (default: "active")
- created_by: UUID (admin user)
- archived_at: timestamp (null if active, populated when archived)
- created_at: timestamp
- updated_at: timestamp
```

**User**
```
- id: UUID (primary key)
- email: string (from Google OAuth)
- name: string (from Google profile)
- google_id: string (OAuth identifier)
- created_at: timestamp
- last_login: timestamp
```

**ProjectUser** (join table for user roles per project)
```
- id: UUID (primary key)
- project_id: UUID (foreign key)
- user_id: UUID (foreign key)
- role: enum ["admin", "inventory_management", "installation", "read_only"]
- assigned_at: timestamp
- assigned_by: UUID (admin who assigned)
```

**Box**
```
- id: UUID (primary key)
- project_id: UUID (foreign key)
- qr_code: string (unique within project)
- label: string (from CSV, e.g., "Equipment name")
- description: text (from CSV)
- created_at: timestamp
```

**BoxStateHistory** (audit log)
```
- id: UUID (primary key)
- box_id: UUID (foreign key)
- state: enum ["received", "in_use", "ready_for_checkout", "departed"]
- state_set_by: UUID (user who triggered transition)
- change_type: enum ["scanned", "manual_override"] (how the state change was triggered)
- condition: enum ["ok", "damaged"] (null for in_use/ready_for_checkout if not scanned)
- notes: text (user input or override reason)
- broken_items: text (list of items, if damaged; only for scanned changes)
- installation_user: UUID (if state = "in_use" AND scanned, who has the box; null if manual override)
- created_at: timestamp
```

**BoxInUseSession** (tracks active use)
```
- id: UUID (primary key)
- box_id: UUID (foreign key)
- installation_user_id: UUID (who activated it)
- usage_notes: text (optional)
- activated_at: timestamp
- completed_at: timestamp (null until returned)
```

---

## 5. Box Lifecycle & State Machine

### 5.1 States

1. **RECEIVED**
   - Box has been checked in by Inventory Management
   - Ready for Installation team to pick up
   - Inventory notes and condition logged

2. **IN-USE**
   - Installation user has scanned QR to activate
   - Box assigned to that specific user
   - Box is on site (location not tracked by system)
   - Optional usage notes can be logged

3. **READY_FOR_CHECKOUT**
   - Installation user has returned the box
   - Box is no longer assigned to a user
   - Awaiting final check-out by Inventory Management
   - Final condition assessment pending

4. **DEPARTED**
   - Box has been checked out by Inventory Management
   - Final condition logged
   - Ready for next shipment or storage

### 5.2 State Transitions

```
RECEIVED (start)
   ↓
   Installation scans → IN-USE (box marked with user name)
   ↓
   Installation returns → READY_FOR_CHECKOUT
   ↓
   Inventory scans → DEPARTED (end)
```

**Transitions by Role:**
- **Inventory Management**: RECEIVED ↔ READY_FOR_CHECKOUT ↔ DEPARTED (check-in/check-out)
- **Installation**: RECEIVED → IN-USE (activate), IN-USE → READY_FOR_CHECKOUT (return)
- **Admin**: Can trigger any valid transition (for corrections/overrides)

**State Validation:** API must validate current state before allowing transition. If state changed since scan initiation, return 409 Conflict with message: "Box state changed — please scan again to see current state."

---

## 6. Scanning Workflows

### 6.1 Check-in Workflow (Inventory Management)

**Precondition:** Admin has set default mode to "check-in"

1. User opens QR scanner interface
2. Points smartphone camera at QR code on box
3. System reads QR → looks up box in project
4. Display shows: box ID, label, current state
5. User selects box condition:
   - **OK**: No issues
   - **Damaged**: List broken items (free text)
6. User adds optional check-in notes (free text)
7. User confirms → system updates `BoxStateHistory`
8. Box state → **RECEIVED**
9. Real-time sync broadcasts to all users on project
10. Next box scan

### 6.2 Installation Activation Workflow (Installation User)

1. User opens QR scanner interface
2. Points camera at QR code
3. System reads QR → looks up box in project
4. Display shows: box ID, label, current state (should be RECEIVED)
5. User confirms activation
6. System updates `BoxInUseSession` with user ID
7. Box state → **IN-USE** (under this user's name)
8. Real-time sync broadcasts
9. Optional: user can add usage notes
10. User takes box to site

### 6.3 Installation Return Workflow (Installation User)

1. User opens QR scanner interface
2. Points camera at QR code (returning box)
3. System reads QR → looks up box
4. Display shows: box ID, label, currently assigned to this user, current state (IN-USE)
5. User confirms return
6. System clears `installation_user` from box record
7. Box transitions to **READY_FOR_CHECKOUT** state
8. Real-time sync broadcasts
9. Inventory team can now scan to check it out

### 6.4 Check-out Workflow (Inventory Management)

**Precondition:** Box is in READY_FOR_CHECKOUT state

1. User opens QR scanner interface (mode: "check-out")
2. Points camera at QR code
3. System reads QR → looks up box
4. Display shows: box ID, label, current state, who used it, what was logged during in-use
5. User selects final condition:
   - **OK**: No new issues
   - **Damaged**: List any new damage found
6. User adds optional check-out notes
7. User confirms → system validates box is still in READY_FOR_CHECKOUT state; if state changed, return 409 Conflict error
8. System updates `BoxStateHistory`
9. Box state → **DEPARTED**
10. Real-time sync broadcasts
11. Next box scan

---

## 7. Real-time Synchronization

### 7.1 Overview

All active users viewing the same project see state changes instantly.

**Technology:** WebSocket (Socket.io or equivalent)

### 7.2 Events Broadcast

When any user performs an action that changes box state:

```
Event: "box_state_changed"
Payload:
{
  box_id: UUID,
  new_state: "received" | "in_use" | "departed",
  user: { id, name, email },
  timestamp: ISO8601,
  condition: string (if applicable),
  installation_user: { id, name } (if in_use),
  notes: string (if any)
}
```

All users on the project receive this event and update their local state.

### 7.3 Dashboard Updates

- Read-only dashboard updates box color in real-time
- Stats (total, received, in-use, departed) update instantly
- No page refresh needed

---

## 8. User Interfaces

### 8.1 Scanner Interface (Mobile-first)

**Layout:**
- Header: Current project selector (dropdown), user name
- Large QR camera feed (full width, 60% of screen)
- Below: action buttons or state display
- Bottom drawer: mode indicator, last scan feedback

**Project Selection:**
- QR codes contain only the box identifier
- User must select a project before scanning
- Defaults to admin-marked active project for the user
- User can switch projects mid-session via dropdown (always visible in header)
- Prevents cross-project scanning mistakes

**Mode Selection (Role-Dependent):**
- **Inventory Manager**: Default mode shown as hint (check-in or check-out, set by admin), but can tap to override
- **Installation User**: Must manually select mode before scanning (buttons: "Activate" or "Return")

**Scanner States:**
1. **Mode selection** (Installation only): "Select action: Activate or Return"
2. **Ready to scan**: "Point camera at QR code" + current project displayed
3. **QR detected**: Shows box ID + label, waits for confirmation
4. **Capture phase**: User selects condition, adds notes (if required for the action)
5. **Confirmation**: "Box scanned successfully" with visual feedback
6. **Next**: Automatically ready for next scan

**Mode display:** 
- Inventory Manager: Shows default mode (e.g., "Mode: Check-in") with tap-to-override option
- Installation User: Shows currently selected mode ("Activate" or "Return") with option to change

**Default Mode Changes (Admin Setting):**
- Admin can change default QR mode at any time (e.g., during off-hours between scan days)
- Changes take effect only for **new sessions** (users opening the scanner UI after the change)
- Users with active UI sessions retain the old mode until they close and reopen the scanner
- This prevents confusion for users mid-workflow on the same day

**Error handling:**
- Invalid QR code → "Box not found in this project"
- Box already in-use → "This box is currently assigned to [user name]"
- Box state changed during scan → "Box state changed — please scan again to see current state" (409 Conflict)
- Permission denied → "You don't have permission to [action] in this project"

### 8.2 Read-only Dashboard

**Layout:**
- Header: Project name, last sync timestamp
- Filter bar: "All / Received / In-Use / Ready for Checkout / Departed"
- Sort options: "By state / By activation time / By user"
- Stats row: total boxes, received count, in-use count, ready-for-checkout count, departed count
- Grid view: each box as color-coded card
  - Blue: RECEIVED
  - Amber: IN-USE (with user name shown)
  - Orange: READY_FOR_CHECKOUT (waiting for check-out)
  - Green: DEPARTED

**Card details:**
- Box ID
- Equipment label
- Current state
- If in-use: Installation user's name and activation time
- Visual indicator if state change was manual override (vs. scanned)

**Interactivity:**
- Click on box → detail view showing:
  - Full state history with change_type (scanned vs. manual_override)
  - All notes and condition assessments
  - Installation user name and duration (if applicable)
  - For manual overrides: reason/notes entered by Inventory Manager
- No edit capability
- Auto-refresh on state changes (WebSocket)

### 8.3 Admin Dashboard

**Tab: Projects**
- List of projects
- Create new project button
- Edit: project name, description

**Tab: Project Settings**
- Project name
- Default QR mode selector (check-in / check-out) — applies to Inventory Managers only
- CSV import button

**Tab: Boxes (per project)**
- List/grid of all boxes with current state
- Click box to see full history
- **Manual Override (Inventory Manager only):** Button to change state
  - Modal: new state selector, free-text reason required
  - Creates audit trail entry with change_type: "manual_override"

**Tab: Users (per project)**
- List of users assigned to project
- Role selector (admin / inventory_management / installation / read_only)
- Add/remove users

**Tab: CSV Upload**
- File upload area (CSV format)
- Validation: duplicate QR codes, required fields (before preview)
- Preview of data to be imported (if validation passes)
- Confirm import button (all-or-nothing transaction)

**CSV Format (required columns):**
```
qr_code, label, description
BOX-001, Steel plates, Industrial-grade steel plates for assembly
BOX-002, Hydraulic pump, 50L/min pump unit
...
```

---

## 9. API Endpoints (RESTful)

### 9.1 Authentication

```
POST /api/auth/login
GET /api/auth/logout
GET /api/auth/user (current user info)
```

### 9.2 Projects

```
GET /api/projects (list user's active projects)
GET /api/projects?status=archived (list user's archived projects, if any)
POST /api/projects (admin only, create new project)
GET /api/projects/{id} (project details - works for both active and archived)
PUT /api/projects/{id} (admin only, update name/description)
POST /api/projects/{id}/csv-upload (admin only, upload inventory - fails if project archived)
PUT /api/projects/{id}/qr-mode (admin only, set default mode - fails if archived)
POST /api/projects/{id}/archive (admin only, archive project)
POST /api/projects/{id}/unarchive (admin only, restore archived project to active)
```

### 9.3 Boxes

```
GET /api/projects/{id}/boxes (list all boxes in project)
GET /api/boxes/{id} (box details + full history)
POST /api/boxes/scan (QR scan event)
  - Payload: { project_id, qr_code, action: "check_in" | "activate" | "return" | "check_out" }
  - Also: condition, notes (context dependent)
  - Validation: API must validate current state matches expected state for action
  - Response: 200 OK on success, 409 Conflict if state changed since scan initiation
  - 409 payload: { error: "Box state changed — please scan again to see current state", current_state: "...", box: {...} }

POST /api/boxes/{id}/state-override (manual state change - Inventory Manager only)
  - Payload: { new_state: "received" | "in_use" | "ready_for_checkout" | "departed", reason: "free text" }
  - Response: 200 OK, creates box_state_history with change_type: "manual_override"
  - Authorization: Inventory Manager role only
```

### 9.4 Users (Admin)

```
GET /api/projects/{id}/users (list users assigned to project)
POST /api/projects/{id}/users (assign user to project with role)
PUT /api/projects/{id}/users/{user_id} (change user role)
DELETE /api/projects/{id}/users/{user_id} (remove user from project)
```

### 9.5 WebSocket Events

```
Connect: /socket.io
Listen for:
  - "box_state_changed" (emitted when any box state changes)
  - "box_scanned" (real-time scan feedback)
  - "user_joined" / "user_left" (presence)

Emit:
  - "join_project" { project_id } (subscribe to project updates)
  - "leave_project" { project_id }
```

---

## 10. Session Management

### 10.1 Session Timeout

- **Session duration:** 12 hours (covers full work day and extended operations)
- **Idle timeout:** Not enforced (12-hour absolute timeout is sufficient)
- **Timeout behavior:** Expired session shows login page; user taps Google OAuth to resume
- **Concurrent sessions:** Multiple devices allowed (tablet + phone login at same time)
- **Permission revocation:** If admin revokes user role while session is active, next API call returns 403; user must re-authenticate

### 10.2 Session on Permission Change

When a user is removed from a project mid-session:
1. User attempts next action (scan, view, etc.)
2. API validates user role in project
3. If role is revoked → return 403 "Your access to this project has been revoked"
4. Frontend shows login page
5. User must re-authenticate

---

## 11. Concurrency & Race Condition Handling

### 11.1 State Validation on Scan

When a user scans a box, the backend must validate that the box's current state matches the expected state for the requested action **before** applying the state transition.

**Example scenario (prevent state race):**
1. User A at 10:00:00.000 scans box-123 to activate (expects RECEIVED)
2. User B at 10:00:00.001 scans box-123 to check out (expects RECEIVED)
3. Both requests hit backend ~50ms apart

**Correct behavior:**
- User A's request processes first: validates box is RECEIVED, transitions to IN-USE ✓
- User B's request arrives: validates box is RECEIVED, finds it is now IN-USE ✗
- Return 409 Conflict to User B with current state and message: "Box state changed — please scan again to see current state"
- User B re-scans, sees box is now IN-USE, cannot check it out

**Implementation:**
- All state transition validations happen within a database transaction
- Check the state at the start of transaction, not before
- If state doesn't match expected, rollback and return 409
- Include current box state and details in 409 response so UI can display helpful info

### 11.2 Audit Trail Accuracy

Every state transition creates an immutable `BoxStateHistory` record. Because validations prevent invalid transitions, the audit trail always reflects the true sequence of state changes.

---

## 12. API Rate Limiting

### 12.1 Rate Limits by Endpoint Category

**General endpoints** (list, view, update):
- 100 requests/minute per user per project
- Return 429 Too Many Requests if exceeded

**Authentication endpoints** (`/api/auth/*`):
- 5 requests/minute per IP (prevents brute force login attempts)
- Return 429 if exceeded

**Scan endpoint** (`/api/boxes/scan`):
- 30 scans/minute per user (prevents rapid-fire spam)
- Return 429 if exceeded

**CSV import** (`/api/projects/{id}/csv-upload`):
- 1 import/minute per project (prevents database thrashing)
- Return 429 if exceeded

### 12.2 Implementation

- Use NextAuth.js built-in rate limiting or simple in-memory token bucket counter
- Track by user ID or IP address depending on endpoint sensitivity
- Graceful degradation: show user "Try again in X seconds" message

---

## 13. QR Code Error Handling & Fallback

### 13.1 Unreadable QR Codes

When user points camera at a QR code and nothing is detected after 3 seconds:

1. Show: "QR code not found — try a clearer angle or enter box ID manually"
2. Provide text input field: "Enter box ID or QR code"
3. User types box ID/QR code string
4. System looks up the box in the project
5. Proceeds with normal scan workflow

This allows scanning of damaged/faded QR codes without manual system intervention.

---

## 14. Mobile Camera Permissions

### 14.1 Camera Permission Handling

**On app load (scanner interface):**
1. Check camera permission status (iOS/Android)
2. **If granted:** Proceed to scanner
3. **If denied:** Show message:
   ```
   "Camera access required to scan boxes.
   
   Go to Settings → [App Name] → Permissions → Camera → Allow"
   ```
   With "Open Settings" button (opens native settings app)
4. **If revoked** (user disables camera in Settings while app is open):
   - Show camera stream error
   - Guide user back to Settings
   - Retry option

### 14.2 Permission States

- **Granted:** Full scanner functionality
- **Denied:** Show guidance, offer manual entry fallback
- **Not yet requested:** Show permission prompt on first scanner access
- **Revoked mid-use:** Gracefully handle, show error with remediation steps

---

## 15. Project Management & Archival

### 15.1 Project Lifecycle

**Active Project:**
- Users can scan boxes, change states, view live dashboard
- Default QR mode configurable by admin
- CSV imports allowed

**Archived Project:**
- No scanning allowed (API returns "This project is archived")
- Box states cannot transition
- All users with project roles can still **view** the project in read-only mode
- Full audit trail and history visible to authorized users
- CSV imports disabled

### 15.2 Project Deletion Policy

**MVP:** Projects can only be archived, never deleted.
- Preserves audit trail and compliance requirements
- Historical data retained forever
- Phase 2: Consider "purge after 90 days" if requested by customers

**Archival process:**
1. Admin clicks "Archive Project" button
2. Confirms: "This project will be read-only. You can still view historical data."
3. Project status changes to "archived"
4. Users see archived projects in separate "Archived Projects" section of dashboard
5. Can unarchive if needed (restore to active status)

---

## 16. Database Schema (Azure SQL Database)

```sql
CREATE TABLE [dbo].[users] (
  [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  [email] VARCHAR(255) UNIQUE NOT NULL,
  [name] VARCHAR(255) NOT NULL,
  [google_id] VARCHAR(255) UNIQUE NOT NULL,
  [created_at] DATETIME DEFAULT GETUTCDATE(),
  [last_login] DATETIME
);

CREATE TABLE [dbo].[projects] (
  [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  [name] VARCHAR(255) NOT NULL,
  [description] TEXT,
  [csv_uploaded_at] DATETIME,
  [default_qr_mode] VARCHAR(20) DEFAULT 'check-in',
  [status] VARCHAR(20) CHECK ([status] IN ('active', 'archived')) DEFAULT 'active',
  [created_by] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]),
  [archived_at] DATETIME,
  [created_at] DATETIME DEFAULT GETUTCDATE(),
  [updated_at] DATETIME DEFAULT GETUTCDATE()
);

CREATE TABLE [dbo].[project_users] (
  [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  [project_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[projects]([id]) ON DELETE CASCADE,
  [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
  [role] VARCHAR(50) NOT NULL CHECK ([role] IN ('admin', 'inventory_management', 'installation', 'read_only')),
  [assigned_at] DATETIME DEFAULT GETUTCDATE(),
  [assigned_by] UNIQUEIDENTIFIER REFERENCES [dbo].[users]([id]),
  UNIQUE([project_id], [user_id])
);

CREATE TABLE [dbo].[boxes] (
  [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  [project_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[projects]([id]) ON DELETE CASCADE,
  [qr_code] VARCHAR(255) NOT NULL,
  [label] VARCHAR(255) NOT NULL,
  [description] TEXT,
  [created_at] DATETIME DEFAULT GETUTCDATE(),
  UNIQUE([project_id], [qr_code])
);

CREATE TABLE [dbo].[box_state_history] (
  [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  [box_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[boxes]([id]) ON DELETE CASCADE,
  [state] VARCHAR(50) NOT NULL CHECK ([state] IN ('received', 'in_use', 'ready_for_checkout', 'departed')),
  [state_set_by] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]),
  [change_type] VARCHAR(50) NOT NULL CHECK ([change_type] IN ('scanned', 'manual_override')) DEFAULT 'scanned',
  [condition] VARCHAR(50),
  [notes] TEXT,
  [broken_items] TEXT,
  [installation_user] UNIQUEIDENTIFIER REFERENCES [dbo].[users]([id]),
  [created_at] DATETIME DEFAULT GETUTCDATE()
);

CREATE TABLE [dbo].[box_in_use_sessions] (
  [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  [box_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[boxes]([id]) ON DELETE CASCADE,
  [installation_user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [dbo].[users]([id]),
  [usage_notes] TEXT,
  [activated_at] DATETIME DEFAULT GETUTCDATE(),
  [completed_at] DATETIME
);

CREATE INDEX [idx_boxes_project] ON [dbo].[boxes]([project_id]);
CREATE INDEX [idx_project_users_project] ON [dbo].[project_users]([project_id]);
CREATE INDEX [idx_state_history_box] ON [dbo].[box_state_history]([box_id]);
CREATE INDEX [idx_state_history_created] ON [dbo].[box_state_history]([created_at] DESC);
```

---

## 12. Backup & Disaster Recovery

### 12.1 Automatic Backups

Azure SQL Database (free tier) includes:
- **Automatic backups:** 35-day retention window (no additional cost)
- **Point-in-time restore:** Can restore database to any point within 35 days
- **Geo-redundant:** Backups replicated to paired Azure region

### 12.2 Manual Backup Process

For additional safety or long-term archival:

```bash
# Export database to BACPAC file (can be stored offline)
az sql db export \
  --resource-group inventory-dev-rg \
  --server inventory-dev-server \
  --name inventory_dev_db \
  --admin-user sqladmin \
  --admin-password YourPassword \
  --storage-key YourStorageKey \
  --storage-uri https://youraccount.blob.core.windows.net/backups/inventory_backup.bacpac
```

### 12.3 Recovery Process (if disaster)

**Data loss scenario:** If the database is corrupted or accidentally deleted:

1. **Quick restore (within 35 days):** Use Azure Portal → point-in-time restore
2. **Longer ago:** Restore from manually exported BACPAC file
3. **Recovery time:** ~30 minutes for full restore (acceptable for MVP)
4. **Responsibility:** Data loss is a user/admin responsibility; system is stateless

**Note:** Boxes are the source of truth, not reports. If data is lost, scan history is lost, but the system can restart fresh with new CSV uploads.

---

## 13. Deployment & Infrastructure

### 13.1 Azure Services

- **Azure App Service**: Host Next.js application
- **Azure SQL Database (Free Offer)**: Database — 100,000 vCore seconds/month, 32 GB storage, zero cost
- **Azure Storage**: CSV uploads (if not embedded in database)

### 13.2 Environment Variables

```
NEXTAUTH_URL=https://inventory.example.com
NEXTAUTH_SECRET=[random-secure-string]
GOOGLE_CLIENT_ID=[from Google Console]
GOOGLE_CLIENT_SECRET=[from Google Console]
DATABASE_URL=Server=servername.database.windows.net,1433;Database=inventory_db;User ID=sqladmin;Password=yourpassword;Encrypt=true;Connection Timeout=30;
NODE_ENV=production
```

### 13.3 Deployment Pipeline

1. Code committed to Git repo
2. CI/CD pipeline runs tests
3. Docker image built
4. Pushed to Azure Container Registry
5. Deployed to Azure App Service (staging)
6. Smoke tests
7. Manual approval
8. Deploy to production

---

## 14. Security Considerations

### 14.1 Authentication

- SSO only (Google OAuth) — no passwords stored
- NextAuth.js handles session management
- Secure cookies (httpOnly, SameSite=Strict)

### 14.2 Authorization

- Role-based access control (RBAC) enforced on backend
- Every API endpoint validates user has required role in project
- **Generic errors for auth failures:** Return 403 "Access denied" (don't reveal project/box details)
- **Specific errors for data issues:** Return 404 "Box not found" (OK — QR codes are not sensitive)
- Project-level isolation: users only see projects they're assigned to
- Users removed from project mid-session: next API call returns 403, forces re-authentication

### 14.3 Data Protection

- HTTPS only (TLS 1.3)
- Database encrypted at rest (Azure managed)
- Sensitive data (user emails, notes) never logged
- Complete audit trail (who did what, when)
- All authorized users in a project can view full audit trail (including hidden notes and damage lists)

### 14.4 QR Code Security

- QR codes contain only box ID (no project ID or sensitive data)
- Project context is user-selected before scanning, not derived from QR
- Can be printed on physical boxes without risk of cross-project access
- If QR leaked, attacker cannot act without authentication and project access

---

## 15. Future Enhancements

### Phase 2

- **Item-level content tracking**: Individual items per box with QR codes (optional)
- **Broken item notifier**: Real-time alerts when items marked damaged
- **Item history feed**: Dedicated dashboard for damage reports

### Phase 3

- **Mobile app**: Native iOS/Android apps (currently web-only)
- **Offline mode**: Scanning works without internet, syncs when connection returns
- **Advanced analytics**: Reports, metrics, trends over time
- **Integration with inventory management systems**: Sync with existing ERP

---

## 16. Testing Strategy

### 16.1 Unit Tests

- Role permission checks
- State machine transitions
- Data validation (CSV import, QR codes)

### 16.2 Integration Tests

- End-to-end workflows (check-in → in-use → ready_for_checkout → check-out)
- Real-time sync across users
- API endpoints with different roles
- Race condition handling: concurrent scans return 409 appropriately
- Permission checks: users removed from projects mid-session return 403

### 16.3 User Acceptance Testing

- Inventory crew tests check-in/check-out workflow
- Installation team tests activation/return workflow
- Admin tests CSV upload and user management
- Supervisor tests dashboard

---

## 17. Success Criteria

**MVP Launch Checklist:**

- ✓ Google OAuth login working
- ✓ QR scanning captures box state in all four phases (RECEIVED, IN-USE, READY_FOR_CHECKOUT, DEPARTED)
- ✓ Real-time sync works across multiple users
- ✓ Race condition handling: concurrent scans properly return 409 Conflict
- ✓ Project selection works (defaults to active project, user can switch)
- ✓ Admin can upload CSV and set default mode
- ✓ Read-only dashboard displays live state with color coding
- ✓ Role-based permissions enforced
- ✓ Complete audit trail logged
- ✓ Deployed to Azure staging, tested in production environment
- ✓ Mobile UI responsive and usable on smartphones
- ✓ Error handling and edge cases documented

---

## 18. Glossary

| Term | Definition |
|------|-----------|
| Box | Physical container with QR code, tracked through lifecycle |
| Check-in | Inventory Management scans box on arrival, logs condition, transitions to RECEIVED |
| Check-out | Inventory Management scans box on departure, logs final condition, transitions to DEPARTED |
| In-use | Box is with Installation user on site (state: IN-USE) |
| Activation | Installation user scans QR to mark box IN-USE and assign to themselves |
| Return | Installation user scans QR to return box, transitions to READY_FOR_CHECKOUT |
| Project | Logical grouping of boxes (e.g., one shipment); user selects before scanning |
| State | Current phase of box: RECEIVED, IN-USE, READY_FOR_CHECKOUT, or DEPARTED |
| SSO | Single Sign-On (Google OAuth) |
| Real-time sync | All users see state changes instantly via WebSocket |
| Active Project | Admin-marked default project for a user; can be switched mid-session |

---

## 19. Contact & Support

**Project Lead:** [To be filled]  
**Technical Lead:** [To be filled]  
**Duration:** MVP expected Q3 2026

---

**Document Version:** 1.0.0  
**Next Review:** Post-MVP launch

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Real-Time Inventory Tracking & Handoff System** — a QR code-based application for tracking equipment boxes through three-phase lifecycle (received → in-use → departed) with real-time state synchronization across multiple users with role-based permissions.

**Status:** Specification phase (planning complete, implementation pending)

**Tech Stack:**
- Frontend: Next.js, React, TypeScript
- Backend: Next.js API Routes, TypeScript
- Database: Azure SQL Database (free tier)
- Authentication: Google OAuth 2.0 (NextAuth.js)
- Real-time: WebSocket (Socket.io)
- Deployment: Azure (App Service, SQL DB, Container Registry)
- CI/CD: GitHub Actions

## Essential Documents

- `inventory_system_spec.md` — Complete technical specification covering data model, API endpoints, state machine, workflows, database schema, UI design
- `deployment_cicd_guide.md` — Azure setup, GitHub Actions workflow, Docker configuration, environment variables, local development setup

## Development Commands

After project initialization (following `deployment_cicd_guide.md`):

```bash
# Install dependencies
npm install

# Development server
npm run dev          # Runs on http://localhost:3000

# Build and test
npm run build        # Build Next.js application
npm run test         # Run Jest test suite (add once tests are created)
npm run lint         # Run Next.js linting

# Database
npx prisma migrate dev --name <migration_name>  # Create and apply migration
npx prisma studio                               # Open Prisma visual DB editor
npx prisma validate                             # Validate schema.prisma

# Docker (local testing before Azure)
docker build -t inventory:latest .
docker run -p 3000:3000 --env-file .env.local inventory:latest

# Deployment (via GitHub Actions on push to main)
# Manual trigger: gh workflow run deploy-dev.yml
```

## Project Structure

```
inventory-system/
├── .github/workflows/
│   └── deploy-dev.yml              # GitHub Actions CI/CD
├── prisma/
│   ├── schema.prisma               # Database schema (ORM)
│   └── migrations/                 # Prisma migrations
├── src/
│   ├── pages/
│   │   ├── index.tsx               # Home/login page
│   │   ├── dashboard.tsx           # Role-based dashboard
│   │   └── api/
│   │       ├── auth/               # NextAuth handlers
│   │       ├── projects/           # Project endpoints
│   │       ├── boxes/              # Box scan & state endpoints
│   │       └── users/              # User role management
│   ├── components/
│   │   ├── QRScanner.tsx           # QR camera component
│   │   ├── Dashboard.tsx           # Color-coded box grid
│   │   ├── AdminPanel.tsx          # Admin project/user management
│   │   └── shared/                 # Buttons, forms, modals
│   ├── lib/
│   │   ├── auth.ts                 # NextAuth configuration
│   │   ├── socket.ts               # Socket.io client setup
│   │   ├── db.ts                   # Prisma client
│   │   └── utils.ts                # Helper functions
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces (Project, Box, BoxState, etc.)
│   └── middleware/
│       └── auth.ts                 # RBAC middleware
├── public/
│   └── logo.png                    # App logo/assets
├── Dockerfile
├── docker-compose.yml
├── .env.example                    # Environment variable template
├── next.config.js
├── tsconfig.json
└── package.json
```

## Core Architecture

### Box State Machine

Three states enforce workflow integrity:
- **RECEIVED** — Box checked in by Inventory team (scan check-in)
- **IN-USE** — Box activated by Installation team (scan activate)
- **DEPARTED** — Box checked out by Inventory team (scan check-out)

Transitions are role-based: Inventory handles RECEIVED↔DEPARTED, Installation handles RECEIVED→IN-USE, Admins can override. No direct transitions allowed (e.g., cannot jump RECEIVED→DEPARTED).

**Data model:** `BoxStateHistory` table maintains complete audit trail with timestamps, user IDs, condition notes, and broken item lists. **Never delete history** — all state changes are permanent records.

### Database Schema (Prisma)

Six core tables:
1. **users** — Google OAuth identities + last login tracking
2. **projects** — Logical grouping of boxes (e.g., one shipment)
3. **project_users** — Role assignments (admin, inventory_management, installation, read_only) at project level
4. **boxes** — Equipment with QR codes (unique per project)
5. **box_state_history** — Immutable audit log of every state change
6. **box_in_use_sessions** — Tracks active use (who has it, when activated, usage notes)

Foreign keys enforce referential integrity. Indexes on `boxes(project_id)`, `state_history(box_id)`, `state_history(created_at)` for performance.

### API Routes

RESTful endpoints by responsibility:
- **`/api/auth/*`** — NextAuth handlers (login, logout, session)
- **`/api/projects`** — CRUD (admins only create/update); list returns user's assigned projects
- **`/api/projects/{id}/boxes`** — List all boxes in project
- **`/api/boxes/scan`** — QR scan event processor (checks permissions, validates state transitions, emits WebSocket events)
- **`/api/projects/{id}/users`** — Project role assignments (admin only)

**Authorization:** All endpoints validate user role against project before responding. Use middleware to attach project context to request. 401 for unauthenticated, 403 for unauthorized.

### Real-time Synchronization (WebSocket)

Socket.io connects to `/socket.io`. On QR scan:
1. Backend processes scan, updates database
2. Backend emits `box_state_changed` event to all users in project
3. Connected clients receive event, update local state (box color, stats)
4. No page refresh needed

Clients join rooms by project: `socket.emit('join_project', { project_id })`. Rooms prevent leaking state across projects.

**Important:** Real-time events are **broadcast only** — they do not persist. State of truth is always the database. If a user disconnects and reconnects, fetch full project state via API, not from cached events.

### Authentication & Authorization

Google OAuth via NextAuth.js creates sessions with secure cookies (httpOnly, SameSite=Strict). Roles are **project-scoped** — a user can be admin in one project and installation in another.

**Permission check pattern:**
```typescript
const user = await prisma.projectUsers.findUnique({
  where: { projectId_userId: { projectId, userId } }
});
if (!user || !['admin', 'inventory_management'].includes(user.role)) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

**Avoid:** Checking permissions in frontend only. Backend must validate every action.

### CSV Import (Admin Only)

Admin uploads CSV with columns: `qr_code, label, description`. 

**Validation:** Check for duplicate QR codes within project (should reject), required fields, max file size. Import creates `Box` records in a transaction (all-or-nothing). Show user a preview before confirming.

## Important Implementation Notes

### Real-time & Consistency

- Socket.io events are **not guaranteed delivery** (network can drop). Always rely on database state.
- When a user scans, emit state change event AFTER database update succeeds, not before.
- Dashboard refreshes on `box_state_changed` event; also fetch full state on page load (API `/api/projects/{id}/boxes`).

### Condition & Damage Tracking

- **Condition** field (`ok` or `damaged`) can be set during check-in or check-out.
- **Broken items** is free-text list of what's damaged (e.g., "Left wheel broken, top handle dented").
- Store as text in database; no separate items table in MVP.

### QR Code Format

QR codes contain: `{projectId}:{boxId}` or just `{boxId}` (must lookup by project context). Codes are **not sensitive** (no user info, no secrets) — safe to print and attach to physical boxes.

### User Flows

1. **Check-in** (Inventory): Scan QR → show box details → select condition → add notes → confirm → state becomes RECEIVED
2. **Activate** (Installation): Scan QR → confirm → state becomes IN-USE (assigned to this user)
3. **Return** (Installation): Scan QR → confirm → state becomes READY_FOR_CHECKOUT
4. **Check-out** (Inventory): Scan QR → select final condition → add notes → confirm → state becomes DEPARTED

Each step must check user role and current box state before allowing action.

## Deployment

### Local Development

```bash
# Create .env.local with:
DATABASE_URL=...  # (from Azure SQL, or local dev database)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=... # Generate: openssl rand -base64 32
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Setup database
npx prisma migrate dev --name init

# Run dev server
npm run dev
```

### Staging/Production (Vercel)

Deployment is automated via Vercel on push to `main`. Workflow:
1. Push to GitHub (main branch)
2. Vercel automatically detects the push
3. Vercel builds Next.js app
4. Run Prisma migrations via postbuild script
5. Deploy to Vercel edge network
6. Custom domain redirects traffic (if configured)

**Setup:**
1. Link GitHub repository to vercel.com
2. Configure environment variables in Vercel dashboard:
   - `DATABASE_URL` → Prisma Postgres connection string
   - `NEXTAUTH_URL` → Your Vercel domain (e.g., `https://project.vercel.app`)
   - `NEXTAUTH_SECRET` → Generate: `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` → From Google OAuth Console
3. Update Google OAuth redirect URIs to include Vercel domain
4. Push to main → Vercel auto-deploys

See `docs/VERCEL_DEPLOYMENT.md` for complete setup and troubleshooting.

**Rollback:** Revert commit on GitHub and push — Vercel automatically re-deploys previous version. Preview deployments are available for each commit.

## Common Tasks

**Add a new API endpoint:**
1. Create route in `src/pages/api/...`
2. Validate user auth + project role
3. Query/update database via Prisma
4. Emit WebSocket event if state changed
5. Return JSON response

**Add a database field:**
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Update TypeScript types in `src/types/index.ts`
4. Update API responses to include new field

**Test a workflow end-to-end:**
1. Create test project via admin panel
2. Upload test CSV with mock boxes
3. Scan boxes using scanner interface
4. Verify state appears on dashboard in real-time
5. Check database `box_state_history` table for audit trail

## Testing Strategy

- **Unit tests** (Jest): Role permission checks, state machine transitions, CSV validation
- **Integration tests:** End-to-end workflows (check-in → in-use → check-out), API endpoints with different roles
- **E2E tests** (optional, later): Selenium/Playwright for browser-based QR scanning

Focus on state machine correctness and permission enforcement — these are the highest-risk areas.

## Constraints & Decisions

- **No item-level tracking in MVP.** Boxes are atomic units; damage lists are strings, not relational data. (Phase 2 could add item QR codes.)
- **No offline mode in MVP.** All scans require internet connectivity.
- **No location tracking.** System assumes boxes are on-site but doesn't know WHERE on-site.
- **Role isolation:** Users assigned to a project have no visibility into other projects (project-scoped roles, not global).
- **No cost for database:** Azure SQL free tier covers MVP. Auto-pauses after 60 min of inactivity.

## Troubleshooting

**Database migration fails on deploy:** Check the migration file in `prisma/migrations/` for syntax errors. Run `npx prisma migrate resolve --rolled-back <migration_name>` to mark it as resolved, fix the SQL, create a new migration.

**Socket.io events not received:** Verify client joined the project room via `socket.emit('join_project', { project_id })`. Check browser console for Socket.io errors. Ensure backend is emitting to the correct room name.

**QR scan not found:** Validate QR code format matches expectation (`projectId:boxId`). Check that box was created in project via CSV import. Verify QR matches database `boxes.qr_code` value exactly (case-sensitive).

---

**Document Version:** 1.0.0  
**Last Updated:** May 2026  
**Spec Version Aligned With:** inventory_system_spec.md v1.0.0

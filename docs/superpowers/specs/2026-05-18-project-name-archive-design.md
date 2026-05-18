# Project Name Editing & Archive Toggle — Design Spec

**Date:** 2026-05-18
**Status:** Approved

## Overview

Add two admin capabilities to the single-project admin page:
1. Edit the project name inline
2. Archive/unarchive a project

Archived projects remain visible in the admin project list (with badge + timestamp) but are hidden from dashboard and scanner page project dropdowns.

## API Changes

**`PUT /api/projects/[id]`** — extend to accept an optional `status` field.

- `name` remains required when updating project settings (existing behavior)
- When only changing status, `name` is not required — the handler must support partial updates (name-only or status-only)
- `status: "archived"` → set `archivedAt = new Date()`
- `status: "active"` → set `archivedAt = null`
- No new endpoint needed; both name and status changes go through this route

**Authorization:** admin role required (unchanged).

## UI: Project Detail Page (`/admin/projects/[id].tsx`)

Add a "Project Settings" card (admin-only) at the top of the page, before the boxes section.

**Name editing section:**
- Text input pre-filled with `project.name`
- "Save" button — disabled when input is empty or value is unchanged from current name
- On submit: `PUT /api/projects/[id]` with `{ name }`
- On success: refresh project state

**Archive section** (below name form, separated by a horizontal border):

When project is active:
- "Archive project" button (amber/muted style)
- Clicking expands an inline confirmation: "This will hide the project from the dashboard and scanner. You can unarchive it later."
- Two buttons appear: "Confirm archive" and "Cancel"
- On confirm: `PUT /api/projects/[id]` with `{ status: "archived" }`

When project is archived:
- Amber "Archived" badge + `archivedAt` formatted timestamp
- "Unarchive" button (green style, no confirmation)
- On click: `PUT /api/projects/[id]` with `{ status: "active" }`

Both actions refresh project state on success.

## UI: Admin Project List (`/admin/index.tsx`)

On each project card where `project.status === "archived"`:
- Amber "Archived" badge displayed next to the project name
- `archivedAt` date shown below the description in muted text

No filtering — all projects (active and archived) remain visible in the admin list.

## Dashboard & Scanner Dropdowns

`GET /api/projects` already defaults to `status=active`. Any page calling `/api/projects` without a `status` param already excludes archived projects. Verify both dashboard and scanner pages use this default; if so, no code change is needed there.

## Out of Scope

- Deleting projects
- Bulk archive actions
- Filtering/sorting the admin project list by status

# Admin Access Control

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Restrict the Admin section to users who hold the `admin` role in at least one project. Non-admins see no Admin nav item and are redirected away from admin pages. Only admins can create new projects.

## Admin Definition

A user is "admin" if they have `role = 'admin'` in at least one active project (`projectUsers` table). No new DB fields required.

## API Changes

### `GET /api/auth/user`
Add `isAdmin: boolean` to the response:
```json
{ "id": "...", "email": "...", "name": "...", "isAdmin": true }
```
`isAdmin` is true when the user has `admin` role in at least one project.

### `POST /api/projects`
Before creating a project, verify the caller has `admin` role in at least one existing project. Return 403 if not. The one system admin creates all projects; regular users cannot create projects.

### All other endpoints
Already correctly scoped by project role — no changes.

## UI Changes

### `src/components/Layout.tsx`
Call `GET /api/auth/user` on mount. Store `isAdmin` in state. Render the Admin nav item only when `isAdmin` is true.

### `src/pages/admin/index.tsx`
On mount, if `isAdmin` is false (checked via `GET /api/auth/user`), redirect to `/dashboard`.

### `src/pages/admin/projects/[id].tsx`
Same redirect guard as admin index.

## Files

| File | Change |
|---|---|
| `src/pages/api/auth/user.ts` | Add `isAdmin` to response |
| `src/pages/api/projects.ts` | Restrict POST to admins |
| `src/components/Layout.tsx` | Fetch isAdmin, hide Admin nav for non-admins |
| `src/pages/admin/index.tsx` | Redirect non-admins to /dashboard |
| `src/pages/admin/projects/[id].tsx` | Redirect non-admins to /dashboard |

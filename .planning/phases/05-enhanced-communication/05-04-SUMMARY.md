---
phase: 05-enhanced-communication
plan: 04
subsystem: api
tags: [fastify, groups, permissions, invites, postgresql]

# Dependency graph
requires:
  - phase: 05-01
    provides: Database schema for groups (groups, group_members, group_invites, group_bans tables)
provides:
  - Complete group management API with CRUD operations
  - Role-based permission system (owner, admin, moderator, member)
  - Member management (add, remove, change role)
  - Ban system with auto-unban on re-add
  - Invite link system with expiry and max uses
  - Join via invite with validation
affects: [05-07, frontend-groups, websocket-group-messages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Four-tier permission system for groups
    - Auto-unban when adding previously banned user

key-files:
  created:
    - backend/src/services/groupService.ts
    - backend/src/routes/groups.ts
  modified:
    - backend/src/server.ts

key-decisions:
  - "Permission system uses hasPermission() check with role-based access"
  - "Owner role cannot be changed or removed"
  - "Banned users auto-unban when explicitly re-added by admin"
  - "Invite codes use base64url encoding (URL-safe)"
  - "Group members query includes user email for display"

patterns-established:
  - "Permission checks return false/null for unauthorized actions"
  - "Service layer handles all business logic, routes are thin wrappers"
  - "JWT user extraction via (request.user as { userId: string }).userId pattern"

# Metrics
duration: 16min
completed: 2026-01-28
---

# Phase 5 Plan 04: Backend Group Service Summary

**Complete group management API with role-based permissions, member management, ban system, and invite links**

## Performance

- **Duration:** 16 min
- **Started:** 2026-01-28T22:59:06Z
- **Completed:** 2026-01-28T23:15:12Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created groupService.ts with CRUD operations and permission checks
- Implemented 13 REST endpoints for complete group management
- Built invite link system with optional expiry and max uses
- Created role-based permission system with 4 tiers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create group service with CRUD and member management** - `bda2475` (feat)
2. **Task 2: Create group REST routes** - `3e7d482` (feat)
3. **Task 3: Register group routes in server** - `57f2278` (feat)

## Files Created/Modified
- `backend/src/services/groupService.ts` - Group business logic with permissions, CRUD, member management, bans, invites
- `backend/src/routes/groups.ts` - 13 REST endpoints for group operations
- `backend/src/server.ts` - Registered groupRoutes with /api prefix

## Decisions Made

**1. Permission system design**
- Four roles: owner (all), admin (most operations), moderator (moderate only), member (send messages)
- hasPermission() function checks role against action
- Owner cannot be removed or have role changed

**2. Ban system behavior**
- Banned users auto-unban when explicitly re-added via addMember()
- Cannot ban owner or admin roles
- Ban check prevents joining via invite

**3. Invite link implementation**
- 8-byte random codes encoded as base64url (URL-safe)
- Optional expiresIn (seconds) and maxUses
- Increment uses counter atomically
- Validation checks: expired, max uses, banned status

**4. JWT user extraction pattern**
- Use cast pattern: `(request.user as { userId: string }).userId`
- Matches actual JWT payload structure from auth service
- Consistent with existing routes (friends.ts pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript JWT payload mismatch**
- Issue: Plan used `request.user.id` but actual JWT payload has `userId`
- Resolution: Used cast pattern `(request.user as { userId: string }).userId` matching existing codebase
- Not a deviation - matched existing patterns from other routes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Frontend group UI integration
- WebSocket group message delivery
- Group conversation view

**Provides:**
- POST /api/groups - Create group
- GET /api/groups - List user's groups
- GET /api/groups/:groupId - Get group details
- PATCH /api/groups/:groupId - Update group
- DELETE /api/groups/:groupId - Delete group
- GET /api/groups/:groupId/members - List members
- POST /api/groups/:groupId/members - Add member
- DELETE /api/groups/:groupId/members/:userId - Remove member
- PATCH /api/groups/:groupId/members/:userId - Change role
- POST /api/groups/:groupId/bans - Ban user
- DELETE /api/groups/:groupId/bans/:userId - Unban user
- POST /api/groups/:groupId/invites - Create invite
- POST /api/groups/join - Join via invite code

**Notes:**
- All endpoints require authentication
- Permission checks enforce role-based access
- Group owner automatically added as first member on creation

---
*Phase: 05-enhanced-communication*
*Completed: 2026-01-28*

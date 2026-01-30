---
phase: 06-social-features
plan: 01
subsystem: database
tags: [postgresql, schema, social-features, avatars, presence, blocking, user-settings]

# Dependency graph
requires:
  - phase: 05-enhanced-communication
    provides: Database schema for messaging, groups, reactions, and files
provides:
  - Database schema for avatars (multi-resolution WebP storage)
  - Database schema for user presence (online/away/dnd/invisible with visibility controls)
  - Database schema for user blocking relationships
  - Database schema for user privacy settings
  - TypeScript interfaces for all social feature models
affects: [06-02, 06-03, 06-04, 06-05, 06-06, 06-07, 06-08, 06-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-resolution avatar storage (32x32, 64x64, 256x256 WebP)"
    - "Presence visibility list for selective status disclosure"
    - "Privacy-first user settings with granular controls"

key-files:
  created: []
  modified:
    - postgres/init.sql
    - backend/src/db/schema.ts

key-decisions:
  - "Three avatar sizes (tiny/small/large) for different UI contexts"
  - "User presence stored in PostgreSQL for persistence, Redis for real-time updates"
  - "Visibility list allows invisible users to show status to specific contacts"
  - "Separate user_settings table for privacy preferences"

patterns-established:
  - "One avatar per user with unique constraint"
  - "Composite primary key for blocking relationships"
  - "CHECK constraint for presence status enum values"
  - "Privacy controls via boolean flags with sensible defaults"

# Metrics
duration: 3min
completed: 2026-01-30
---

# Phase 6 Plan 1: Database Schema Summary

**PostgreSQL schema for avatars, user presence, blocking, and privacy settings with TypeScript type safety**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-30T16:25:02Z
- **Completed:** 2026-01-30T16:28:23Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Added four new database tables for social features foundation
- Created TypeScript interfaces matching PostgreSQL schema
- Applied schema changes to running database container
- Verified all tables with proper foreign keys, indexes, and constraints

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: Schema changes** - `01ecc9b` (feat)
   - Added avatars, user_presence, blocks, user_settings tables to init.sql
   - Added TypeScript interfaces to schema.ts
   - Schema verified and applied to database

## Files Created/Modified
- `postgres/init.sql` - Added four social feature tables with proper constraints and indexes
- `backend/src/db/schema.ts` - Added Avatar, UserPresence, Block, UserSettings interfaces and PresenceStatus type

## Decisions Made

**1. Three avatar sizes for responsive UI**
- tiny_path (32x32), small_path (64x64), large_path (256x256)
- All WebP format for optimal file size
- Paths nullable to allow gradual avatar generation

**2. Dual-storage for user presence**
- PostgreSQL for persistence and offline last_seen tracking
- Redis (to be implemented) for real-time status updates
- Visibility list enables "invisible to all except these users" feature

**3. Privacy-first defaults**
- show_last_seen defaults to true (user can opt out)
- allow_friend_requests defaults to true (user can disable)
- Separate user_settings table isolates privacy controls from core user data

**4. Blocking as composite primary key**
- (blocker_id, blocked_id) ensures no duplicate blocks
- Bidirectional indexes for efficient "am I blocked?" and "who have I blocked?" queries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**PostgreSQL container data persistence**
- Database container had existing data from previous runs
- init.sql only runs on fresh database initialization
- Resolved by applying new schema directly via psql commands
- All tables created successfully with correct structure

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All social feature tables ready for backend service implementation:
- Avatar upload/resize endpoints can reference avatars table
- Presence tracking can use user_presence table
- Blocking logic can query blocks table
- User settings API can manage user_settings table

No blockers. Ready for Plan 02 (avatar upload service).

---
*Phase: 06-social-features*
*Completed: 2026-01-30*

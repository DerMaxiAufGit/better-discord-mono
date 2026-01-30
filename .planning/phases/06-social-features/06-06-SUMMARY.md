---
phase: 06-social-features
plan: 06
subsystem: frontend
tags: [presence, websocket, real-time, auto-away, activity-tracking]

# Dependency graph
requires:
  - phase: 06-03
    provides: Backend presence service with WebSocket lifecycle tracking
provides:
  - Frontend presence tracking with persisted status
  - Auto-away after 5 minutes idle
  - Real-time presence updates via WebSocket
  - Batch presence fetching for friends list
affects: [frontend-ui, friend-list, user-profile]

# Tech tracking
tech-stack:
  added: []
  patterns: [presence-tracker-singleton, activity-event-tracking, zustand-persistence]

key-files:
  created: [frontend/src/stores/presenceStore.ts, frontend/src/lib/presence/presenceTracker.ts]
  modified: [frontend/src/lib/api.ts, frontend/src/lib/websocket/useMessaging.ts]

key-decisions:
  - "Status persists to localStorage via Zustand persistence middleware"
  - "Auto-away only triggers when status is 'online' (respects DND/invisible)"
  - "Activity tracking uses passive event listeners for performance"
  - "Presence fetching happens on WebSocket connect for friends list"

patterns-established:
  - "presenceTracker singleton manages activity timers and heartbeat"
  - "Activity events: mousemove, keydown, click, scroll, touchstart"
  - "presenceStore with Map-based cache for user presence data"
  - "5-minute auto-away timeout, 2-minute heartbeat interval"

# Metrics
duration: 7min
completed: 2026-01-30
---

# Phase 6 Plan 6: Frontend Presence Tracking Summary

**Frontend presence tracking with auto-away after 5 minutes idle, real-time WebSocket updates, and persisted status management**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-30T17:17:53Z
- **Completed:** 2026-01-30T17:25:29Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Presence API with status management and batch fetching
- Presence store with Zustand persistence for status across page refreshes
- Activity tracker with auto-away after 5 minutes idle
- WebSocket integration with presence_update message handling
- Friends presence batch fetch on WebSocket connect

## Task Commits

Each task was committed atomically:

1. **Task 1: Create presence API and store** - `cd44c7d` (feat)
2. **Task 2: Create presence tracker with auto-away** - `6370db5` (feat)
3. **Task 3: Integrate presence with WebSocket** - `b54e830` (feat)

## Files Created/Modified
- `frontend/src/lib/api.ts` - Added presenceApi with updateStatus, getUserStatus, getBatchStatus, setVisibilityList methods
- `frontend/src/stores/presenceStore.ts` - Zustand store with myStatus, visibilityList, presenceMap (Map<userId, presence>)
- `frontend/src/lib/presence/presenceTracker.ts` - Activity tracking singleton with auto-away and heartbeat
- `frontend/src/lib/websocket/useMessaging.ts` - Start/stop presenceTracker on connect/disconnect, handle presence_update messages

## Decisions Made

**1. Status persists via Zustand middleware**
- Only myStatus and visibilityList persist to localStorage
- presenceMap (others' status) is ephemeral and rebuilt on connect
- Prevents stale presence data across sessions

**2. Auto-away only when status is 'online'**
- Respects user's manual status selection (DND, invisible)
- wasAway flag tracks if user was auto-away vs manually away
- Activity restores to online only if auto-away triggered it

**3. Passive event listeners for performance**
- Activity events use `{ passive: true }` option
- Prevents blocking scroll/touch events
- Five event types: mousemove, keydown, click, scroll, touchstart

**4. Friends presence fetched on connect**
- WebSocket onopen fetches friends list via friendsApi
- Batch presence request for all friend IDs
- Non-blocking - presence updates arrive asynchronously

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing TypeScript error in slider.tsx**
- Unrelated error in UI component (property 'value' incompatibility)
- Verified presence files have no TypeScript errors
- Build succeeded despite pre-existing error

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- UI components displaying user presence (status badges, online indicators)
- Status selector dropdown for manual status changes
- User profile showing last seen timestamps
- Friend list showing online/offline/away/dnd status

**Blockers:**
- None

**Concerns:**
- Activity event listeners may need throttling on high-frequency events (mousemove)
- Consider debouncing activity timer reset to reduce CPU usage

---
*Phase: 06-social-features*
*Completed: 2026-01-30*

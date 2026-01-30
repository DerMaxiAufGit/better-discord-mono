---
phase: 06-social-features
plan: 12
subsystem: ui
tags: [zustand, react, presence, blocking, websocket, reactivity]

# Dependency graph
requires:
  - phase: 06-social-features
    provides: Presence system, blocking system, message search
provides:
  - Fixed Zustand presence reactivity with plain object
  - Invisible whitelist working correctly
  - Auto-restore friendship on unblock
  - Blocked Users on Contacts page
  - Group message search highlighting
affects: [Phase 7 - any future presence/blocking work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain objects instead of Maps for Zustand reactivity"
    - "Auto-restore friendship on unblock for better UX"

key-files:
  created: []
  modified:
    - frontend/src/stores/presenceStore.ts
    - frontend/src/pages/ContactsPage.tsx
    - frontend/src/components/messaging/ConversationView.tsx
    - backend/src/services/presenceService.ts
    - backend/src/services/blockService.ts
    - frontend/src/pages/SettingsPage.tsx
    - frontend/src/pages/MessagesPage.tsx

key-decisions:
  - "Convert presenceMap from Map to Record for reliable Zustand reactivity"
  - "Auto-restore friendship on unblock instead of requiring new friend request"
  - "Preserve actual status from DB for disconnected users (enables invisible whitelist)"
  - "Move Blocked Users section from Settings to Contacts page"

patterns-established:
  - "Use plain objects (Record) instead of Maps in Zustand stores for reactivity"
  - "Unblock auto-sends friend request to restore friendship immediately"

# Metrics
duration: 11min
completed: 2026-01-30
---

# Phase 06 Plan 12: UAT Gap Closure Summary

**Fixed 6 UAT gaps: presence reactivity with plain objects, invisible whitelist status preservation, auto-restore friendship on unblock, Blocked Users relocated to Contacts, and group message highlighting**

## Performance

- **Duration:** 11 min
- **Started:** 2026-01-30T21:13:53Z
- **Completed:** 2026-01-30T21:25:42Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Presence updates now trigger live re-renders in Contacts list via plain object in Zustand
- Invisible users' whitelist works correctly by preserving DB status for disconnected users
- Unblock immediately restores friendship, allowing messaging without new friend request
- Blocked Users section moved from Settings to Contacts page for better UX
- Group message search results now highlight correctly when clicked
- All 6 UAT gaps closed, Phase 6 feature-complete

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix presence reactivity with plain object** - `b614513` (fix)
2. **Task 2: Fix invisible whitelist and unblock friendship restoration** - `f266cc3` (fix)
3. **Task 3: Move Blocked Users to Contacts and fix group highlighting** - `38d82e3` (fix)

## Files Created/Modified
- `frontend/src/stores/presenceStore.ts` - Converted presenceMap from Map to Record<string, UserPresence> for Zustand reactivity
- `frontend/src/pages/ContactsPage.tsx` - Updated to use bracket notation, added Blocked Users section with unblock handler
- `frontend/src/components/messaging/ConversationView.tsx` - Updated to use bracket notation for presenceMap
- `backend/src/services/presenceService.ts` - Preserve row.status from DB instead of hardcoding 'offline'
- `backend/src/services/blockService.ts` - Auto-send friend request on unblock to restore friendship
- `frontend/src/pages/SettingsPage.tsx` - Removed Blocked Users section and related imports/state
- `frontend/src/pages/MessagesPage.tsx` - Added highlightMessageId prop to group MessageList

## Decisions Made

**Convert presenceMap to plain object for Zustand reactivity:**
- Zustand's shallow comparison doesn't reliably detect Map mutations
- Plain objects (Record<string, UserPresence>) trigger re-renders consistently
- All Map.get() calls changed to bracket notation
- Spread operator used instead of Map.set()

**Auto-restore friendship on unblock:**
- Better UX than requiring new friend request
- blockService.unblockUser() now calls friendService.sendRequest()
- Wrapped in try/catch to ignore if already friends
- ContactsPage.handleUnblock calls loadFriends() to refresh UI

**Preserve actual status from DB for invisible whitelist:**
- presenceService was hardcoding status='offline' for disconnected users
- Changed to use row.status from database
- Allows invisible whitelist logic to detect status='invisible' and show 'online' to whitelisted friends

**Move Blocked Users to Contacts page:**
- User feedback indicated Settings was wrong location
- Moved section to bottom of Friends tab in ContactsPage
- Added handleUnblock function with loadFriends() call
- Removed from SettingsPage entirely

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all gaps diagnosed correctly, fixes applied cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 Social Features now feature-complete with all UAT gaps closed
- All 6 diagnosed issues fixed and verified via container rebuild
- Presence reactivity working live without refresh
- Invisible whitelist correctly shows whitelisted friends as Online
- Unblock restores friendship immediately
- Blocked Users on Contacts page as expected
- Group search highlighting working in all conversations
- Ready for Phase 7 planning

---
*Phase: 06-social-features*
*Completed: 2026-01-30*

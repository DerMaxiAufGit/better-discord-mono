---
phase: 04-ui-polish-production-readiness
plan: 05
subsystem: error-handling-feedback
tags: [connection-state, toast-notifications, error-feedback, websocket, ui]

dependency-graph:
  requires:
    - 04-02-SUMMARY.md  # Toast infrastructure
  provides:
    - ConnectionBanner component
    - Connection status tracking in messageStore
    - API error toast integration
    - WebSocket state feedback
  affects:
    - Future error boundaries (plan 06+)
    - Connection recovery strategies

tech-stack:
  added: []
  patterns:
    - Global connection state in Zustand store
    - Banner-style status indicators (non-modal, non-toast)
    - Conditional toast on reconnection (not initial connect)
    - API error interceptors with toast integration

key-files:
  created:
    - frontend/src/components/error/ConnectionBanner.tsx
  modified:
    - frontend/src/stores/messageStore.ts
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/lib/websocket/useMessaging.ts
    - frontend/src/lib/api.ts

decisions:
  - decision: "Banner (not modal/toast) for connection state"
    rationale: "Persistent indicator doesn't auto-dismiss, lets user continue viewing cached content"
    alternatives: ["Toast notifications (auto-dismiss)", "Modal (blocks interaction)"]
    date: 2026-01-28
  - decision: "Toast only on reconnection success, not initial connect"
    rationale: "Reduces toast fatigue, initial connect is expected"
    alternatives: ["Toast on every connect", "No toasts for connection"]
    date: 2026-01-28
  - decision: "Connection status in messageStore (not separate store)"
    rationale: "WebSocket already in useMessaging, messageStore is logical home for connection state"
    alternatives: ["Separate connectionStore", "Local state in useMessaging"]
    date: 2026-01-28
  - decision: "showApiError for non-401 errors"
    rationale: "401 has dedicated auth flow, other errors need user visibility"
    alternatives: ["Toast all errors", "Console log only"]
    date: 2026-01-28

metrics:
  duration: 6 min
  completed: 2026-01-28
---

# Phase 4 Plan 5: Connection State Feedback & Error Toasts Summary

Connection state feedback with subtle banner and toast notifications for errors.

## What Was Built

**1. ConnectionBanner Component**
- Subtle banner at top of layout showing connection state
- Yellow indicator with spinner for 'connecting'
- Red indicator with wifi-off icon for 'disconnected'
- Auto-hides when status is 'connected'
- Non-intrusive design allows viewing cached content

**2. Connection Status Tracking**
- Added `connectionStatus` to messageStore ('connected'|'connecting'|'disconnected')
- Enables AppShell to read status without depending on useMessaging hook
- Defaults to 'connecting' on initial load

**3. AppShell Integration**
- ConnectionBanner rendered at top of layout
- Reads connectionStatus from messageStore
- Positioned above incoming call banner

**4. Toast Notifications**
- API errors show toast via showApiError helper
- 401 errors excluded (handled by auth flow)
- WebSocket reconnection shows success toast
- Toast only on reconnection (not initial connect)

**5. WebSocket State Updates**
- useMessaging updates connectionStatus on state changes
- Flow: disconnected -> waiting 3s -> connecting -> connected
- Reconnection logic maintains connection status visibility

## Key Files

### Created
- `frontend/src/components/error/ConnectionBanner.tsx` - Connection state banner component

### Modified
- `frontend/src/stores/messageStore.ts` - Added connectionStatus state and setter
- `frontend/src/components/layout/AppShell.tsx` - Integrated ConnectionBanner
- `frontend/src/lib/websocket/useMessaging.ts` - Updates connectionStatus, toasts on reconnection
- `frontend/src/lib/api.ts` - Added showApiError for non-401 errors

## Decisions Made

1. **Banner vs Modal/Toast for Connection State**
   - Chose: Persistent banner
   - Why: Doesn't auto-dismiss, non-blocking, clear status indicator
   - Allows users to continue viewing cached content while offline

2. **Toast Only on Reconnection**
   - Chose: Toast.success only when reconnecting after disconnect
   - Why: Reduces toast fatigue, initial connection is expected behavior
   - User still sees banner during connecting state

3. **Connection Status in messageStore**
   - Chose: Add to existing messageStore instead of separate store
   - Why: WebSocket is already in useMessaging, logical coupling
   - Avoids store proliferation for related state

4. **API Error Toasts (Except 401)**
   - Chose: showApiError for all non-401 errors
   - Why: 401 has dedicated auth flow, other errors need visibility
   - Prevents duplicate error feedback

## Implementation Highlights

**Connection Flow:**
```
Initial: connecting (default) -> connected
Disconnect: connected -> disconnected -> (wait 3s) -> connecting -> connected
```

**Banner States:**
- Connected: Hidden (returns null)
- Connecting: Yellow background, spinner, "Reconnecting..."
- Disconnected: Red background, wifi-off icon, "Connection lost. Trying to reconnect..."

**Toast Integration:**
- API errors: Immediate toast with error message
- Reconnection: Toast.success("Connected") only after being disconnected
- No toast on initial connection

## Testing & Verification

Verified:
1. TypeScript compiles without errors
2. connectionStatus present in messageStore
3. ConnectionBanner integrated in AppShell
4. showApiError imported and used in api.ts
5. setConnectionStatus called in useMessaging.ts

Success criteria met:
- ✓ messageStore tracks connectionStatus
- ✓ ConnectionBanner shows when WebSocket disconnected
- ✓ ConnectionBanner auto-hides when reconnected
- ✓ API errors show toast notifications
- ✓ Toast not shown for 401 errors

## Commits

1. `6e58688` - feat(04-05): create ConnectionBanner component
2. `ea9fd6d` - feat(04-05): add connectionStatus to messageStore
3. `a441869` - feat(04-05): integrate ConnectionBanner into AppShell
4. `585e575` - feat(04-05): add toast notifications and connection status updates

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Enables:**
- Error boundaries can leverage connectionStatus
- Consistent error feedback patterns established
- Foundation for more sophisticated error recovery

**Considerations:**
- May want retry logic for specific API errors
- Consider exponential backoff for WebSocket reconnection
- Could add connection quality indicators (latency, packet loss)

**No blockers for next plan.**

## Related Documentation

- Plan: `.planning/phases/04-ui-polish-production-readiness/04-05-PLAN.md`
- Context: `.planning/phases/04-ui-polish-production-readiness/04-CONTEXT.md`
- Toast infrastructure: `04-02-SUMMARY.md`

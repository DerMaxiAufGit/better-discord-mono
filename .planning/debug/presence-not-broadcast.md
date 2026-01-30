---
status: diagnosed
trigger: "Friends don't see presence status changes - neither in groups nor in direct messages. User can see their own status."
created: 2026-01-30T12:00:00Z
updated: 2026-01-30T12:15:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Zustand subscription issue with getPresence function
test: Verified that ContactsPage destructures getPresence but not presenceMap
expecting: Component won't re-render when presenceMap updates
next_action: Return root cause

## Symptoms

expected: When user changes status (Online/Away/DND/Invisible), friends see the updated status
actual: Friends don't see presence status changes - neither in groups nor in direct messages. User can see their own status.
errors: None reported
reproduction: Change status, check if friends see the update
started: Unknown

## Eliminated

- hypothesis: Backend not broadcasting presence updates
  evidence: presenceService.broadcastStatus correctly iterates friends and calls broadcastToUsers
  timestamp: 2026-01-30T12:08:00Z

- hypothesis: Frontend not receiving WebSocket messages
  evidence: useMessaging.ts line 283-286 handles presence_update and calls updateUserPresence
  timestamp: 2026-01-30T12:09:00Z

- hypothesis: presenceStore not updating presenceMap
  evidence: updateUserPresence creates new Map to trigger Zustand reactivity (line 47)
  timestamp: 2026-01-30T12:10:00Z

## Evidence

- timestamp: 2026-01-30T12:05:00Z
  checked: presenceStore.ts setMyStatus method
  found: Calls presenceApi.updateStatus(status) - HTTP API call
  implication: Frontend correctly sends status change to backend via HTTP

- timestamp: 2026-01-30T12:06:00Z
  checked: backend presence.ts route PUT /status
  found: Calls presenceService.updateStatus(userId, status, visibilityList)
  implication: Backend route correctly calls presenceService

- timestamp: 2026-01-30T12:07:00Z
  checked: presenceService.ts updateStatus method (lines 70-103)
  found: Updates DB, updates presenceCache.set(), then calls broadcastStatus()
  implication: Backend stores status and initiates broadcast

- timestamp: 2026-01-30T12:08:00Z
  checked: presenceService.ts broadcastStatus method (lines 221-253)
  found: Gets friends list, calls getVisibleStatus for each, sends presence_update via broadcastToUsers
  implication: Broadcast logic exists and is called

- timestamp: 2026-01-30T12:09:00Z
  checked: useMessaging.ts line 283-286
  found: Frontend handles presence_update and calls updateUserPresence
  implication: Frontend handler exists and updates store

- timestamp: 2026-01-30T12:10:00Z
  checked: presenceStore.ts updateUserPresence method
  found: Creates new Map(state.presenceMap).set() to trigger reactivity
  implication: Store state is correctly updated

- timestamp: 2026-01-30T12:11:00Z
  checked: ContactsPage.tsx line 44
  found: const { getPresence, fetchBatchPresence } = usePresenceStore()
  implication: Component destructures getPresence function but NOT presenceMap

- timestamp: 2026-01-30T12:12:00Z
  checked: presenceStore.ts line 93
  found: getPresence: (userId: string) => get().presenceMap.get(userId)
  implication: getPresence is a stable function reference that never changes

- timestamp: 2026-01-30T12:13:00Z
  checked: ContactsPage.tsx lines 286, 291-292
  found: Uses getPresence(friend.oderId)?.status in JSX
  implication: Component calls getPresence but isn't subscribed to presenceMap changes

## Resolution

root_cause: Zustand subscription bug - ContactsPage destructures getPresence function but doesn't subscribe to presenceMap. When presence_update WebSocket messages arrive and updateUserPresence is called, presenceMap is updated but ContactsPage doesn't re-render because it's not subscribed to presenceMap changes - only to the stable getPresence function reference.

fix:
verification:
files_changed: []

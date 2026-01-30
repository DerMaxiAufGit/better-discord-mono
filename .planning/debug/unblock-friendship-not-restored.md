---
status: investigating
trigger: "Unblock Doesn't Restore Friendship"
created: 2026-01-30T00:00:00Z
updated: 2026-01-30T00:00:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: blockService.unblockUser() doesn't call friendService.sendRequest() despite plan claiming it does
test: reading backend blockService.ts implementation
expecting: if missing friend request call, that's the root cause
next_action: read blockService.ts and friendService.ts

## Symptoms

expected: When unblocking a user, friendship should be automatically restored via auto-sent friend request
actual: User has to manually send friend request after unblocking to reconnect
errors: None reported
reproduction: Block a friend -> Unblock from Blocked Users section -> Friendship not restored
started: Current behavior (06-12-PLAN claimed fix but not implemented)

## Eliminated

## Evidence

- timestamp: 2026-01-30T00:01:00Z
  checked: backend/src/services/blockService.ts lines 43-55
  found: unblockUser() DOES call friendService.sendRequest(blockerId, blockedId) with try/catch
  implication: backend is correctly sending friend request on unblock

- timestamp: 2026-01-30T00:02:00Z
  checked: backend/src/services/friendService.ts lines 22-63
  found: sendRequest() creates pending friend request, or auto-accepts if other person already sent request
  implication: friend request mechanism works correctly

- timestamp: 2026-01-30T00:03:00Z
  checked: frontend/src/pages/ContactsPage.tsx lines 170-181
  found: handleUnblock() calls loadFriends() after unblock (line 175) with comment "Refresh friends since unblock restores friendship"
  implication: frontend IS refreshing friends list after unblock

- timestamp: 2026-01-30T00:04:00Z
  checked: frontend/src/stores/blockStore.ts lines 67-80
  found: unblockUser() only calls blocksApi.unblock() and updates local block state, does NOT refresh friend store
  implication: blockStore is isolated from friendStore, needs to trigger friend list refresh

- timestamp: 2026-01-30T00:05:00Z
  checked: backend/src/routes/blocks.ts lines 22-31
  found: DELETE /:userId endpoint calls blockService.unblockUser() which sends friend request
  implication: backend IS creating friend request on unblock

- timestamp: 2026-01-30T00:06:00Z
  hypothesis: Backend creates pending friend request, but frontend doesn't refresh to show it
  test: Check if ContactsPage.loadFriends() is actually being called and if pending requests tab would show the request
  expecting: loadFriends() returns accepted friends only, NOT pending requests - unblock creates pending request which won't appear in friends list

- timestamp: 2026-01-30T00:07:00Z
  re-checked: backend/src/services/friendService.ts lines 38-39
  found: If addressee already sent a request to requester, it auto-accepts via acceptRequest()
  implication: If B blocked A (friendship deleted), then B unblocks A, sendRequest(B→A) creates pending request. A needs to accept it.

- timestamp: 2026-01-30T00:08:00Z
  re-checked: backend/src/services/friendService.ts lines 22-63
  found: sendRequest creates 'pending' request, returns it. Only auto-accepts if OTHER person already sent request first.
  implication: Unblock does NOT auto-accept friendship - it creates a pending outgoing request from unblocker to unblocked

## Resolution

root_cause: Unblock sends a friend request (pending status) instead of auto-accepting friendship. Backend comment says "auto-restores friendship" but actually creates pending request requiring acceptance from unblocked user. Expected behavior: unblock should create 'accepted' friend request, not 'pending'.

fix: Modify blockService.unblockUser() to directly create an accepted friend request instead of calling sendRequest()
verification: Unblock user, verify they immediately appear in friends list as accepted
files_changed:
  - backend/src/services/blockService.ts

---
status: diagnosed
trigger: "After unblock, still can't send messages"
created: 2026-01-30T10:00:00Z
updated: 2026-01-30T10:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - Unblock removes block record but does not restore friendship, and messaging requires friendship
test: Traced code path from block -> unblock -> message attempt
expecting: Backend rejects message because areFriends() returns false
next_action: Return diagnosis

## Symptoms

expected: After unblocking a user, should be able to send messages to them again
actual: Messages fail after unblock with "You can only message friends" error
errors: WebSocket returns error: "You can only message friends"
reproduction: Block user -> Unblock user -> Try to send message -> Fails
started: Always broken - by design (but design is unexpected)

## Eliminated

None - first hypothesis confirmed

## Evidence

- timestamp: 2026-01-30T10:05:00Z
  checked: blockService.blockUser() implementation
  found: Line 31 calls friendService.removeFriend() when blocking - this DELETES the friendship
  implication: Blocking destroys friendship permanently

- timestamp: 2026-01-30T10:10:00Z
  checked: blockService.unblockUser() implementation
  found: Only deletes from blocks table (line 44-47), does NOT restore friendship
  implication: Unblock clears block record but friendship remains deleted

- timestamp: 2026-01-30T10:15:00Z
  checked: websocket.ts message handler (lines 133-141)
  found: Messages require areFriends() to return true before sending
  implication: After unblock, user can't message because they're no longer friends

- timestamp: 2026-01-30T10:20:00Z
  checked: Frontend ConversationView.tsx
  found: MessageInput is never disabled based on block/friend state - it just shows success/error after attempt
  implication: UI allows typing but backend rejects - user sees error

- timestamp: 2026-01-30T10:25:00Z
  checked: blockService comment on unblockUser (line 42)
  found: Comment says "Note: Does NOT restore friendship - user must send new friend request"
  implication: This is INTENTIONAL design but unexpected UX - user thinks unblock = restore

## Resolution

root_cause: |
  **Design vs Expectation Mismatch**

  The blocking system is designed with these behaviors:
  1. blockUser() auto-unfriends (deletes friendship record)
  2. unblockUser() only removes block record, does NOT restore friendship
  3. Messaging requires areFriends() to be true

  After unblock flow:
  - Block record: DELETED (correct)
  - Friendship record: STILL DELETED (by design, but unexpected)
  - areFriends(): returns FALSE
  - Message attempt: REJECTED with "You can only message friends"

  The code has a comment documenting this is intentional, but users expect
  unblocking to fully restore the previous state, including messaging ability.

fix: |
  Two possible approaches:

  **Option A (Minimal - UX improvement):**
  After unblock in frontend, show toast: "User unblocked. Send a friend request to message them again."
  This matches the current backend design.

  **Option B (Full restore - better UX):**
  Modify unblockUser() to optionally restore friendship:
  - Add `restoreFriendship` parameter to unblockUser()
  - If user was friends before block, restore the friendship on unblock
  - This requires tracking "was friends before block" state

  **Recommended: Option A** for now (simpler), with consideration for Option B later.

verification: N/A - diagnosis only
files_changed: []

---
status: diagnosed
trigger: "Blocked User Messages Not Hiding Live in Groups"
created: 2026-01-30T00:00:00Z
updated: 2026-01-30T00:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: MessageList doesn't react to blockStore changes because it doesn't subscribe to blocked users
test: Check MessageList component's store subscriptions and message filtering logic
expecting: MessageList likely only reads blockStore once, not subscribing to changes
next_action: Read MessageList.tsx and check store usage patterns

## Symptoms

expected: When blocking a user, their messages in group chats should immediately hide or show "Message from blocked user"
actual: Messages from blocked user remain visible until page refresh
errors: None reported
reproduction: Block a user while viewing a group chat with their messages
started: Current phase 6 implementation

## Eliminated

## Evidence

- timestamp: 2026-01-30T00:05:00Z
  checked: MessageList.tsx line 79
  found: Component reads `isBlocked` function from blockStore
  implication: Function is extracted once during component render

- timestamp: 2026-01-30T00:06:00Z
  checked: MessageList.tsx line 235
  found: `const senderBlocked = isBlocked(message.senderId);` called inside render
  implication: This calls the function from closure, but doesn't subscribe to blockedIds changes

- timestamp: 2026-01-30T00:07:00Z
  checked: blockStore.ts lines 28-87
  found: blockStore has `blockedIds` Set and `blockUser` updates it optimistically
  implication: The Set updates correctly when blocking, but MessageList doesn't re-render

- timestamp: 2026-01-30T00:08:00Z
  checked: MessageList.tsx component subscriptions
  found: Component only subscribes to `isBlocked` function, not to `blockedIds` state
  implication: When blockedIds Set changes, MessageList doesn't know to re-render

## Resolution

root_cause: MessageList extracts only the isBlocked function from blockStore without subscribing to blockedIds state. When a user is blocked, blockedIds Set updates but MessageList doesn't re-render because it's not subscribed to that state change.

fix: N/A (diagnosis only)
verification: N/A (diagnosis only)
files_changed: []

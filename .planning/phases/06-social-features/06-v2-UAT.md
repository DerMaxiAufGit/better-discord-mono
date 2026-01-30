---
status: diagnosed
phase: 06-social-features
source: [06-01 through 06-12 SUMMARY files]
started: 2026-01-30T22:00:00Z
updated: 2026-01-30T22:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Upload Avatar
expected: In Settings page, click to select an image file. A cropper modal appears with zoom slider. Crop and click Save. Avatar appears in your profile across the app.
result: pass

### 2. Avatar Display in Messaging
expected: Your avatar appears in the conversation list (left sidebar), in message bubbles you send, and in the conversation header when friends view your chat.
result: pass

### 3. Set Presence Status
expected: In Settings page, click status dropdown. Select Away, DND, or Invisible. Your status indicator changes color. Friends see your new status live (without refresh).
result: pass

### 4. Auto-Away After Idle
expected: Set status to Online, then leave the app idle for 5+ minutes. Your status automatically changes to Away. Moving mouse restores Online status.
result: pass

### 5. Last Seen Display in DMs
expected: Open a direct message conversation. Below the contact's name in the header, you see "Online" with status indicator OR "Last seen X minutes/hours ago" for offline users.
result: pass

### 6. Invisible Mode with Whitelist
expected: Set status to Invisible in Settings. Open visibility list and select specific friends. Those friends see you as Online with status indicator. Others see you as Offline with "Last seen" time.
result: issue
reported: "whitelisted users don't see the invisible user as online."
severity: major

### 7. Block User from Conversation
expected: In a DM conversation header, click the dropdown menu (three dots or similar). Select Block. Confirmation dialog appears explaining consequences. Confirm to block.
result: pass

### 8. Blocked Messages Hidden
expected: After blocking a user, their messages in group chats are hidden. Direct messages cannot be sent in either direction (the chat should show a blocked state or be inaccessible).
result: issue
reported: "hidden messages from blocked users don't show live in groups. only after refresh"
severity: major

### 9. Unblock User from Contacts
expected: On Contacts page, scroll to "Blocked Users" section at the bottom. Click Unblock on a blocked user. User is unblocked and friendship is restored - you can message them immediately.
result: issue
reported: "friendship is not restored. has to be restored manually."
severity: major

### 10. Search Messages
expected: In Messages page, type in search bar. After 300ms, results appear grouped by conversation showing matching messages. Results show username (not UUID) for the sender.
result: pass

### 11. Search Navigate and Highlight
expected: Click a search result. App navigates to that conversation with the matching message scrolled into view and highlighted briefly (yellow/gold background that fades after ~3 seconds).
result: pass

## Summary

total: 11
passed: 8
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Whitelisted friends see invisible user as Online with status indicator"
  status: failed
  reason: "User reported: whitelisted users don't see the invisible user as online."
  severity: major
  test: 6
  root_cause: "VisibilityList.tsx line 36 has typo - uses f.otherId instead of f.oderId, causing whitelist to be populated with undefined values"
  artifacts:
    - path: "frontend/src/components/presence/VisibilityList.tsx"
      issue: "Line 36 uses wrong property name otherId instead of oderId"
  missing:
    - "Change f.otherId to f.oderId in VisibilityList.tsx line 36"
  debug_session: ".planning/debug/invisible-whitelist-not-working.md"

- truth: "Blocked user messages hidden live in groups without refresh"
  status: failed
  reason: "User reported: hidden messages from blocked users don't show live in groups. only after refresh"
  severity: major
  test: 8
  root_cause: "MessageList subscribes to isBlocked function but not blockedIds state, preventing re-render when Set updates"
  artifacts:
    - path: "frontend/src/components/messaging/MessageList.tsx"
      issue: "Line 79 extracts isBlocked function without subscribing to blockedIds state changes"
  missing:
    - "Subscribe to blockedIds Set state instead of isBlocked function to trigger re-renders on block/unblock"
  debug_session: ".planning/debug/blocked-messages-not-hiding-live.md"

- truth: "Unblock automatically restores friendship for immediate messaging"
  status: failed
  reason: "User reported: friendship is not restored. has to be restored manually."
  severity: major
  test: 9
  root_cause: "blockService.unblockUser() calls sendRequest() which creates pending request requiring acceptance, not accepted friendship"
  artifacts:
    - path: "backend/src/services/blockService.ts"
      issue: "Line 51 calls friendService.sendRequest() which creates pending request, should create accepted friendship directly"
    - path: "backend/src/services/friendService.ts"
      issue: "sendRequest() only auto-accepts if reciprocal request exists, otherwise creates pending"
  missing:
    - "Create friendService method to directly create accepted friendship, or modify blockService to insert accepted record"
  debug_session: ".planning/debug/unblock-friendship-restore.md"

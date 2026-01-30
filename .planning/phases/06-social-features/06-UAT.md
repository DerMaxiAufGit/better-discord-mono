---
status: diagnosed
phase: 06-social-features
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-09-SUMMARY.md]
started: 2026-01-30T19:00:00Z
updated: 2026-01-30T19:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Upload Avatar
expected: In Settings page, click to select an image file. A cropper modal appears with zoom slider. Crop and click Save. Avatar appears in your profile across the app.
result: pass

### 2. Avatar Display Across App
expected: Your avatar appears in the sidebar, contacts page, and anywhere your profile is shown. Other users see your avatar when they view your messages or profile.
result: issue
reported: "doesn't show in groups and direct messages. works in contacts view."
severity: major

### 3. Set Presence Status
expected: In Settings page, click status dropdown. Select Away, DND, or Invisible. Your status indicator changes color. Friends see your new status.
result: issue
reported: "i see the current status, friends don't neither in groups, nor in direct messages"
severity: major

### 4. Auto-Away After Idle
expected: Set status to Online, then leave the app idle for 5+ minutes. Your status automatically changes to Away. Moving mouse restores Online status.
result: pass

### 5. Last Seen Display
expected: In Contacts page, each friend shows "just now", "X minutes ago", "X hours ago", or "X days ago" below their username based on their last activity.
result: issue
reported: "i see it in the contacts tab. it should be also in direct messages. and update live. users should not have to refresh the page to see the status"
severity: major

### 6. Invisible Mode with Visibility List
expected: Set status to Invisible in Settings. Open visibility list, select specific friends. Those friends see you as Online, others see you as Offline.
result: issue
reported: "invisible whitelist doesn't work. when i whitelist a user, he sees me still as 'Last seen just now'. Even after i refresh both clients"
severity: major

### 7. Block User
expected: On a user profile or contacts page, click Block button. Confirmation dialog appears explaining consequences. Confirm to block. User disappears from friends list.
result: issue
reported: "there is no block button"
severity: major

### 8. Blocked Messages Hidden
expected: After blocking a user, their messages in group chats show as "Message from blocked user" with option to reveal. Direct messages cannot be sent in either direction.
result: skipped
reason: Cannot test - blocking UI not available (depends on test 7)

### 9. Unblock User
expected: In blocked users settings, click Unblock on a blocked user. User is unblocked but not re-added as friend. Must send new friend request to reconnect.
result: skipped
reason: Cannot test - no block button (test 7) and no blocked users settings section visible

### 10. Search Messages
expected: In Messages page, type in search bar. After 300ms, results appear grouped by conversation showing matching messages with highlighted search terms.
result: issue
reported: "it shows a uuid when the search hits something. i guess you meant to put the username there? (remember not the email prefix, use the username)"
severity: minor

### 11. Search Navigate to Message
expected: Click a search result. App navigates to that conversation with the matching message visible/highlighted.
result: issue
reported: "it navigates to the chat but it doesn't highlight the message."
severity: minor

## Summary

total: 11
passed: 2
issues: 8
pending: 0
skipped: 2

## Gaps

- truth: "Avatar appears in sidebar, contacts page, groups, and direct messages"
  status: failed
  reason: "User reported: doesn't show in groups and direct messages. works in contacts view."
  severity: major
  test: 2
  root_cause: "Multiple messaging components use generic Avatar component instead of AvatarDisplay which fetches actual user avatar images"
  artifacts:
    - path: "frontend/src/components/messaging/ConversationView.tsx"
      issue: "Uses generic Avatar, not AvatarDisplay"
    - path: "frontend/src/components/messaging/MessageList.tsx"
      issue: "Uses generic Avatar for message sender"
    - path: "frontend/src/components/messaging/ConversationList.tsx"
      issue: "Uses generic Avatar for conversation list items"
  missing:
    - "Replace Avatar with AvatarDisplay in ConversationView, MessageList, ConversationList"

- truth: "Friends see user's presence status changes in groups and direct messages"
  status: failed
  reason: "User reported: i see the current status, friends don't neither in groups, nor in direct messages"
  severity: major
  test: 3
  root_cause: "Zustand subscription bug - components using getPresence() function don't subscribe to presenceMap changes, so they don't re-render when presence updates arrive"
  artifacts:
    - path: "frontend/src/pages/ContactsPage.tsx"
      issue: "Destructures getPresence function but doesn't subscribe to presenceMap"
    - path: "frontend/src/stores/presenceStore.ts"
      issue: "getPresence is a getter that doesn't create Zustand subscriptions"
  missing:
    - "Components need to subscribe to presenceMap directly or use selector hook"

- truth: "Last seen displays in direct messages and updates live without page refresh"
  status: failed
  reason: "User reported: i see it in the contacts tab. it should be also in direct messages. and update live. users should not have to refresh the page to see the status"
  severity: major
  test: 5
  root_cause: "ConversationView lacks LastSeenText component entirely, and ContactsPage doesn't reactively subscribe to presenceStore changes"
  artifacts:
    - path: "frontend/src/components/messaging/ConversationView.tsx"
      issue: "Header has no LastSeenText component"
    - path: "frontend/src/pages/ContactsPage.tsx"
      issue: "Uses getPresence() getter which is not reactive"
  missing:
    - "Add LastSeenText to ConversationView header"
    - "Use proper zustand selector for reactive updates"

- truth: "Whitelisted friends see invisible user as Online instead of showing last seen"
  status: failed
  reason: "User reported: invisible whitelist doesn't work. when i whitelist a user, he sees me still as 'Last seen just now'. Even after i refresh both clients"
  severity: major
  test: 6
  root_cause: "GET /status endpoint returns 'online'/'offline' based only on connection status, ignoring actual status (invisible/away/dnd) from presenceCache"
  artifacts:
    - path: "backend/src/routes/presence.ts"
      issue: "GET /status returns isOnline ? 'online' : 'offline' instead of actual persisted status"
    - path: "frontend/src/stores/presenceStore.ts"
      issue: "loadInitialStatus() only fetches visibilityList, not myStatus"
  missing:
    - "Backend should return actual persisted status from presenceCache"
    - "Frontend should load and restore myStatus from server"

- truth: "Block button visible on user profile or contacts page"
  status: failed
  reason: "User reported: there is no block button"
  severity: major
  test: 7
  root_cause: "BlockButton component exists but is never imported or rendered in any UI component"
  artifacts:
    - path: "frontend/src/components/blocking/BlockButton.tsx"
      issue: "Component implemented but not integrated"
    - path: "frontend/src/pages/ContactsPage.tsx"
      issue: "Has useBlockStore but no BlockButton"
    - path: "frontend/src/components/messaging/ConversationView.tsx"
      issue: "Header has call button but no BlockButton"
  missing:
    - "Add BlockButton to ConversationView header"
    - "Add BlockButton to ContactsPage friends list"

- truth: "Blocked users settings section visible in Settings page"
  status: failed
  reason: "User reported: also there is no blocked users setting (or i can't find it)"
  severity: major
  test: 9
  root_cause: "SettingsPage has no blocked users section - blockStore exists but is not used in Settings"
  artifacts:
    - path: "frontend/src/pages/SettingsPage.tsx"
      issue: "No import of useBlockStore, no blocked users section"
    - path: "frontend/src/stores/blockStore.ts"
      issue: "Store correctly implemented but not used in Settings"
  missing:
    - "Add Blocked Users section to SettingsPage with list and unblock buttons"

- truth: "Search results show username instead of UUID for sender"
  status: failed
  reason: "User reported: it shows a uuid when the search hits something. i guess you meant to put the username there? (remember not the email prefix, use the username)"
  severity: minor
  test: 10
  root_cause: "senderName lookup uses conversation contactId instead of message senderId, so current user's messages show UUID"
  artifacts:
    - path: "frontend/src/stores/messageStore.ts"
      issue: "Gets contact by contactId, uses that username for ALL messages including user's own"
  missing:
    - "Look up senderName based on msg.senderId, not contactId"
    - "For own messages, use current user's username"

- truth: "Search result click highlights the matching message in conversation"
  status: failed
  reason: "User reported: it navigates to the chat but it doesn't highlight the message."
  severity: minor
  test: 11
  root_cause: "MessageId from search results is received but not used - no mechanism to pass target message ID to MessageList"
  artifacts:
    - path: "frontend/src/pages/MessagesPage.tsx"
      issue: "onResultClick handler ignores _messageId parameter"
    - path: "frontend/src/components/messaging/MessageList.tsx"
      issue: "Has scrollToMessage function but no prop to receive target message ID"
  missing:
    - "Add highlightMessageId prop to MessageList"
    - "Pass messageId from search result to ConversationView/MessageList"

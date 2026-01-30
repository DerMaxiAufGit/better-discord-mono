---
status: complete
phase: 06-social-features
source: [06-11-SUMMARY.md - verification of gap fixes]
started: 2026-01-30T20:30:00Z
updated: 2026-01-30T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Avatar Display in Conversation List
expected: In Messages page sidebar, conversations show contact's uploaded avatar (not generic initials)
result: pass

### 2. Avatar Display in Message Bubbles
expected: In a conversation, each message shows sender's actual avatar next to the message bubble
result: pass

### 3. Avatar Display in Conversation Header
expected: The conversation header shows the contact's avatar to the left of their name
result: pass

### 4. Presence Status Visible to Friends
expected: Change your status to Away in Settings. Have another user (friend) check their contacts list - your status indicator should show yellow (Away)
result: issue
reported: "status doesn't update live in contacts like it does in the chat directly. invisible whitelist doesn't work either"
severity: major

### 5. Last Seen in Direct Messages
expected: Open a DM conversation. Below the contact's name in the header, you should see "Last seen X minutes/hours ago" or "Online"
result: pass

### 6. Presence Updates Live (No Refresh)
expected: Open Contacts page with another user showing Online. Have them close browser. Your view should update to show their last seen time without refreshing
result: issue
reported: "doesn't update. neither when closing the tab nor when setting to invisible. only after refresh not live"
severity: major

### 7. Invisible Whitelist Working
expected: Set status to Invisible. Add one friend to visibility list. That friend should see you as "Online" while other friends see you as "Offline" / "Last seen..."
result: issue
reported: "doesn't work. still shows offline when someone is whitelisted"
severity: major

### 8. Block Button in Conversation Header
expected: Open a DM conversation. Click the three-dot menu (or similar) in the header. "Block" option should appear in the dropdown
result: issue
reported: "block works. after unblock i still can't send messages tho."
severity: major

### 9. Block Button in Contacts Page
expected: On Contacts page, each friend card should have a Block button visible
result: pass

### 10. Blocked Users in Settings
expected: In Settings page, scroll to find a "Blocked Users" section showing your blocked users with Unblock buttons
result: issue
reported: "blocked users should be moved to contacts page"
severity: minor

### 11. Search Shows Usernames
expected: Search for a word in messages. Results should show actual usernames (like "john_doe") not UUIDs
result: pass

### 12. Search Result Highlights Message
expected: Click a search result. Navigates to that conversation and the matching message is briefly highlighted (colored background)
result: issue
reported: "works in 1:1 but not in groups. it opens the group but doesn't jump to message or highlight it"
severity: major

## Summary

total: 12
passed: 6
issues: 6
pending: 0
skipped: 0

## Gaps

- truth: "Friends see user's presence status update live in contacts list"
  status: failed
  reason: "User reported: status doesn't update live in contacts like it does in the chat directly. invisible whitelist doesn't work either"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []

- truth: "Presence updates live on Contacts page without refresh"
  status: failed
  reason: "User reported: doesn't update. neither when closing the tab nor when setting to invisible. only after refresh not live"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []

- truth: "Whitelisted friends see invisible user as Online"
  status: failed
  reason: "User reported: doesn't work. still shows offline when someone is whitelisted"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []

- truth: "After unblock, users can send messages again"
  status: failed
  reason: "User reported: block works. after unblock i still can't send messages tho."
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []

- truth: "Blocked Users section in Settings page"
  status: failed
  reason: "User reported: blocked users should be moved to contacts page"
  severity: minor
  test: 10
  root_cause: ""
  artifacts: []
  missing: []

- truth: "Search result click highlights message in groups"
  status: failed
  reason: "User reported: works in 1:1 but not in groups. it opens the group but doesn't jump to message or highlight it"
  severity: major
  test: 12
  root_cause: ""
  artifacts: []
  missing: []

---
status: resolved
trigger: "Invisible Whitelist Not Working - whitelisted friends still see 'Last seen' instead of Online"
created: 2026-01-30T00:00:00Z
updated: 2026-01-30T00:00:04Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - VisibilityList.tsx uses wrong property name
test: Verified backend returns 'oderId' but VisibilityList uses 'otherId'
expecting: This is the root cause
next_action: Return diagnosis

## Symptoms

expected: When user sets status to Invisible and whitelists specific friends, those whitelisted friends should see the user as Online with green status indicator
actual: Whitelisted friends see "Last seen" instead of Online status
errors: None reported
reproduction: 1) User A sets status to Invisible 2) User A whitelists User B 3) User B checks User A's status - sees "Last seen" instead of Online
started: After phase 6 implementation, previous fix attempt in 06-12 did not resolve

## Eliminated

## Evidence

- timestamp: 2026-01-30T00:00:01Z
  checked: presenceService.ts getVisibleStatus() lines 108-148
  found: When status='invisible' and viewer is whitelisted, function returns { status: 'online', lastSeen } at line 136. Uses presence.visibilityList.includes(viewerUserId) check at line 135.
  implication: Backend logic is correct - returns 'online' if viewerUserId is in visibility list

- timestamp: 2026-01-30T00:00:02Z
  checked: presenceService.ts updateStatus lines 70-99
  found: When updateStatus is called without visibilityList, it runs UPDATE query that doesn't modify visibility_list (line 87), then RETURNING * gets existing visibility_list from DB (line 97) and stores in cache.
  implication: Visibility list persists correctly across status changes

- timestamp: 2026-01-30T00:00:03Z
  checked: VisibilityList.tsx line 36
  found: Uses f.otherId to extract friend ID - `id: f.otherId`
  implication: Typo - should be 'oderId' not 'otherId'

- timestamp: 2026-01-30T00:00:04Z
  checked: friendService.ts line 144
  found: Backend getFriends() returns object with property 'oderId' (not 'otherId')
  implication: CONFIRMED BUG - VisibilityList.tsx line 36 uses wrong property name

- timestamp: 2026-01-30T00:00:04Z
  checked: ContactsPage.tsx uses correct property
  found: ContactsPage.tsx correctly uses friend.oderId throughout (lines 63, 300, 301, 303, 308, 317, 326, 332)
  implication: Other components use correct property, only VisibilityList has the typo

## Resolution

root_cause: VisibilityList.tsx line 36 has typo - uses `f.otherId` instead of `f.oderId`. Since the friends API returns 'oderId', accessing 'otherId' returns undefined. This causes the visibility list to be populated with undefined values instead of actual user IDs. When backend checks if viewerUserId is in visibilityList, it never matches because the list contains [undefined] instead of actual IDs.
fix: Change VisibilityList.tsx line 36 from `id: f.otherId` to `id: f.oderId`
verification: After fix, test by: 1) Set status to Invisible 2) Whitelist a friend 3) Have that friend check your status - should see "Online" with green indicator
files_changed: [frontend/src/components/presence/VisibilityList.tsx]

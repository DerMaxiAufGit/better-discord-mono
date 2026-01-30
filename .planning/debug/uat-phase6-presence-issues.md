---
status: diagnosed
trigger: "Phase 6 UAT - presence issues: status doesn't update live in contacts, presence doesn't update live, invisible whitelist doesn't work"
created: 2026-01-30T12:00:00Z
updated: 2026-01-30T12:00:00Z
---

## Current Focus

hypothesis: Three related issues all stem from frontend reactivity and backend whitelist logic
test: Code analysis complete
expecting: Root causes identified
next_action: Return diagnosis

## Symptoms

expected:
1. Status updates should appear live in ContactsPage (like they do in chat)
2. Presence changes (closing tab, going invisible) should update live on Contacts
3. Invisible mode whitelist should show "online" to whitelisted users

actual:
1. Status only updates after page refresh on ContactsPage
2. Presence only updates after refresh, not live
3. Whitelisted users still see "offline" for invisible users

errors: No errors - functionality gap

reproduction:
1. Open ContactsPage, have friend change status - no live update
2. Friend closes tab or goes invisible - ContactsPage doesn't update
3. Set status to invisible, whitelist a user - they still see offline

started: Since feature implementation

## Evidence

- timestamp: 2026-01-30T12:00:00Z
  checked: ContactsPage.tsx subscription pattern
  found: Line 45 selects entire presenceMap: `const presenceMap = usePresenceStore((state) => state.presenceMap);`
  implication: Zustand Map reactivity issue - selecting entire Map doesn't trigger re-renders when Map values change

- timestamp: 2026-01-30T12:00:01Z
  checked: ConversationView.tsx subscription pattern
  found: Line 76 selects specific value: `const presence = usePresenceStore((state) => state.presenceMap.get(contactId));`
  implication: This works because it returns a primitive/object value that changes on update

- timestamp: 2026-01-30T12:00:02Z
  checked: Zustand documentation on Map reactivity
  found: Zustand uses shallow reference equality (===) for change detection. Selecting entire Map creates reference equality issues.
  implication: Even when Map values change via `new Map(state.presenceMap).set()`, the component may not re-render if selecting entire Map

- timestamp: 2026-01-30T12:00:03Z
  checked: presenceService.ts getVisibleStatus() invisible logic
  found: Lines 116-131 - when user NOT in presenceCache (offline/disconnected), it loads from DB with `status: 'offline' as PresenceStatus` hardcoded
  implication: Even if DB has `status: 'invisible'`, the code overrides it to 'offline' because user is not connected. Whitelist check at line 134 then checks `presence.status === 'invisible'` which is FALSE (it's 'offline')

- timestamp: 2026-01-30T12:00:04Z
  checked: Backend invisible whitelist flow when user IS in cache (connected)
  found: When user is in presenceCache, their actual status is preserved, whitelist check works
  implication: Whitelist only works when invisible user is actively connected. If they disconnected, status becomes 'offline' before whitelist check

## Eliminated

(none - first hypotheses confirmed)

## Resolution

root_cause: |
  **Issue 1 & 2 (Live updates on ContactsPage):**
  Zustand selector pattern issue. ContactsPage selects the entire `presenceMap` Map object.
  Due to how Zustand's shallow comparison works with Map objects, even though the store
  correctly updates the Map with new values, React doesn't detect the change because
  the Map reference comparison is unreliable for triggering re-renders.

  ConversationView works because it selects `presenceMap.get(contactId)` - returning
  the actual value which changes, not the Map container.

  **Issue 3 (Invisible whitelist):**
  Backend logic bug in presenceService.ts getVisibleStatus(). When a user is NOT in
  the presenceCache (disconnected), the code loads their record from the database but
  HARDCODES `status: 'offline'` instead of using the persisted status from DB.

  The whitelist check `if (presence.status === 'invisible')` then fails because status
  is 'offline', not 'invisible'. The whitelist logic is never executed.

  The invisible user must be actively connected for their whitelist to work, which
  defeats the purpose of being "invisible but visible to select friends."

fix: See structured diagnosis below

verification: Pending implementation

files_changed:
  - frontend/src/pages/ContactsPage.tsx (needs selector fix)
  - backend/src/services/presenceService.ts (needs invisible status preservation)

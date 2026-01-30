# Phase 6: Social Features - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Add social networking layer: profile avatars, friend requests, presence status, user blocking, and message search. This phase builds on the existing messaging and group infrastructure from Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Profile Avatars
- User crops to square region during upload (interactive cropper)
- Default avatar: generic placeholder icon for all users without uploads
- Store three sizes: tiny (32px), small (64px), large (256px)
- Users can remove avatar via clear button in profile settings, reverting to default

### Friend Requests
- Request-to-message model: non-friends can send one intro message, then must be accepted
- Dedicated "Requests" tab in contacts with badge count for pending requests
- Requests never expire automatically; sender can withdraw/cancel their request
- Silent decline: recipient declines without notification to sender, request disappears from sender's view

### Presence System
- Manual status with four states: Online, Away, Do Not Disturb, Invisible
- "Last seen" timestamps with privacy setting (users can hide their own last-seen)
- Do Not Disturb: full silence — no sounds or visual notifications, only badge counts
- Invisible mode with selective visibility: user can choose specific friends who see true status
- Auto-away triggers after 5 minutes idle, only if status is set to Online
- Quick toggle for visibility list in status picker, full friend list management in settings
- Status persists across sessions (user returns to last status on login)

### Blocking Behavior
- Clear indication: blocked user sees "You can't message this user"
- On block: prompt "Delete conversation history?" — if declined, messages remain visible
- Blocking auto-unfriends; unblocked user must send new friend request
- Group conversations: placeholder "Message from blocked user" with option to reveal

### Claude's Discretion
- Exact cropper UI component choice
- Avatar compression/quality settings
- Status update broadcast frequency
- Block list UI organization

</decisions>

<specifics>
## Specific Ideas

- Invisible mode with selective visibility is key — user wants to appear offline to most but available to close friends
- "Request to message" model prevents spam while allowing discovery — single intro message before friendship required
- Group behavior with blocked users: don't auto-hide, but give user control with "reveal" option

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-social-features*
*Context gathered: 2026-01-30*

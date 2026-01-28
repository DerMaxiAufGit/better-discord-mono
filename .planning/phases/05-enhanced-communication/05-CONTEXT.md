# Phase 5: Enhanced Communication - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand communication capabilities with video calls, group conversations, file/image sharing, message reactions, and typing indicators. All features maintain E2E encryption. Screen sharing and sub-channels are deferred to future phases.

</domain>

<decisions>
## Implementation Decisions

### Video Calls
- Camera preview shown before call connects (user checks appearance first)
- Camera off by default when joining/initiating call
- Unified call mode: one call type with video toggle (not separate audio/video call buttons)
- Both parties can have video on simultaneously
- Self-view is toggleable: small overlay, split view, or hidden
- Click video feed to expand to fullscreen
- Video visible in minimized/PiP call window
- Background blur and virtual backgrounds supported
- User-selectable video quality (Low/Medium/High in settings)
- Camera selection remembered across sessions
- Full controls available both before joining and during call (camera, mic, blur, quality)
- Silent fallback to avatar if camera fails mid-call (audio continues)

### Group Conversations
- Maximum 200+ participants per group
- Multi-tier role system: Owner, Admins, Moderators, Members
- Granular permissions: each role has configurable permission flags
- Custom group name and uploadable avatar/icon
- Editable group description field
- Invite methods: direct add for contacts, shareable invite links for others
- Ban list managed by admin; removed users can't rejoin via link until unbanned
- Adding user back automatically unbans them
- System messages for member changes ("User was removed by Admin")
- Collapsible/toggleable member list sidebar panel
- User and role mentions supported (@username, @admin, @everyone)
- Mute notification options: 1h, 8h, 24h, forever
- Single message thread per group (sub-channels deferred)
- E2E encrypted messages

### File & Image Sharing
- Maximum file size: 100MB+
- All file types allowed (no restrictions)
- Multiple files per message supported
- Images display inline with download option
- Videos play inline with controls, download available
- Lightbox/gallery view for images (fullscreen with zoom/pan)
- E2E encrypted files (encrypted client-side before upload)
- Local server storage (self-hosted disk)

### Reactions & Emoji
- Twemoji set for cross-platform consistency
- Up to 50 unique emoji reactions per message
- Toggle-style: one reaction per emoji per user, click again to remove
- Quick-react bar with 5-6 common emojis for fast access
- User-customizable quick-react emoji set
- Custom/uploaded emoji support for groups (Discord-style)
- Hover shows list of users who reacted
- Reactions E2E encrypted as message metadata

### Typing Indicators
- Display format: "Name is typing" with animated dots
- 5-second timeout after typing stops
- Group chats: show names for up to 2 users, then "3+ people are typing..."

### Message Threading
- Inline replies to specific messages (quote and reply)

### Claude's Discretion
- Video quality adaptation algorithms
- Exact permission flag definitions for group roles
- File thumbnail generation approach
- Emoji picker search and categorization
- Typing event debounce timing

</decisions>

<specifics>
## Specific Ideas

- Video preview before joining similar to Zoom/Google Meet pre-join screen
- Lightbox for images should allow navigation between multiple images in a message
- Quick reactions should feel snappy like Slack/Discord
- Inline replies should show a preview of the quoted message

</specifics>

<deferred>
## Deferred Ideas

- Screen sharing — Phase 7 (Advanced Features)
- Sub-channels within groups (text and voice channels) — Phase 7+ (server/guild functionality)

</deferred>

---

*Phase: 05-enhanced-communication*
*Context gathered: 2026-01-28*

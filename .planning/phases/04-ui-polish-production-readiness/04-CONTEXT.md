# Phase 4: UI Polish & Production Readiness - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the existing application feel polished and production-ready across devices. This includes mobile responsiveness, loading states, error handling, and user recovery flows. No new features — refinement of existing functionality.

</domain>

<decisions>
## Implementation Decisions

### Mobile Layout
- **Navigation**: Bottom navigation bar on mobile (replaces sidebar)
- **Breakpoint**: 768px (md) — phones and small tablets get mobile layout
- **Conversation view**: Full-screen on mobile, back button returns to list
- **Active call**: Full-screen by default, minimize option to floating window
- **Incoming call**: Full-screen takeover on mobile (like native phone call)
- **Touch gestures**: Both swipe-back navigation AND swipe actions on messages
- **Message input**: Auto-grow to reasonable height, then scroll within
- **Settings**: Nested navigation (categories list → drill into sections)

### Loading States
- **Style**: Context-dependent mix — skeletons for lists, spinners for actions, progress for uploads
- **Message history**: Full conversation skeleton on first load
- **Sending messages**: Message appears immediately with pending/clock icon
- **Navigation**: No global loading indicator — each section handles its own

### Error Handling UX
- **Display strategy**: Context-dependent — toasts for minor, banners for persistent, modals for critical
- **Failed messages**: Auto-retry first, then show manual retry option with red indicator
- **WebSocket disconnect**: Subtle indicator (icon/dot) showing connection state
- **Offline state**: Banner only — let user continue viewing cached content

### Recovery Patterns
- **Auth expiry**: Silent token refresh — user never sees re-login unless refresh fails
- **Refresh failure**: Modal with login form — preserve app state, don't redirect
- **Call failures**: Auto-retry with "Reconnecting..." feedback, up to 3 attempts
- **Pull to refresh**: Yes, on all lists (conversations and contacts)

### Claude's Discretion
- Exact skeleton designs and animations
- Toast positioning and timing
- Specific retry intervals and backoff
- Tablet-specific optimizations beyond the 768px breakpoint

</decisions>

<specifics>
## Specific Ideas

- Incoming call on mobile should feel like a native phone call screen
- Message input behavior: "auto-grow to a reasonable height and then use scrolling"
- Login modal on session expiry preserves current app state (don't lose context)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ui-polish-production-readiness*
*Context gathered: 2026-01-28*

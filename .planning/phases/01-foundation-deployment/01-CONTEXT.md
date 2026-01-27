# Phase 1: Foundation & Deployment - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Docker infrastructure, user authentication (signup/login/persistent sessions), and light/dark mode theming. This phase delivers a deployable app shell where users can create accounts and log in — no messaging yet. Messaging and calls are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Authentication UX
- Signup collects email + password only (minimal friction, display name can come later)
- Login errors use generic message ("Invalid credentials") — more secure, doesn't reveal user existence
- Sessions last 7 days with sliding window refresh (resets on activity)
- Login/signup pages use centered card layout
- Password input shows strength meter (visual feedback, soft guidance instead of hard rules)
- Show/hide password toggle (eye icon) on password fields
- After successful signup, auto-login (go straight to app, no redirect to login)

### Theme Implementation
- Default to system preference detection (follow OS light/dark setting)
- Theme toggle lives in header/navbar (always visible, quick access)
- Toggle uses sun/moon icon (click to switch)
- Smooth fade transition when switching themes (~200ms)
- Persist user preference across sessions

### App Shell Layout
- Left sidebar navigation (Discord/Slack style)
- Sidebar is collapsible (can minimize to icons only)
- Phase 1 sidebar content: minimal — user avatar, theme toggle, logout only
- Main content area shows welcome/empty state when logged in ("Welcome to [App]" placeholder)

### Claude's Discretion
- Loading state implementation for auth actions (button spinner vs overlay)
- Exact sidebar collapse animation
- Welcome state illustration/copy
- Documentation depth and structure

</decisions>

<specifics>
## Specific Ideas

- Discord/Slack-style left sidebar navigation
- Modern centered card for auth pages
- Smooth transitions for theme switching

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-deployment*
*Context gathered: 2026-01-27*

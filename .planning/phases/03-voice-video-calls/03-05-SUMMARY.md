---
phase: 03
plan: 05
subsystem: voice-calls
tags: [webrtc, react-hooks, ui-components, call-management]
dependency_graph:
  requires: ["03-02", "03-03", "03-04"]
  provides: ["useCall-hook", "call-ui-components"]
  affects: ["03-06", "03-07"]
tech_stack:
  added: []
  patterns: ["custom-events-for-signaling", "draggable-floating-window"]
key_files:
  created:
    - frontend/src/lib/webrtc/useCall.ts
    - frontend/src/components/call/CallControls.tsx
    - frontend/src/components/call/CallTimer.tsx
    - frontend/src/components/call/CallQualityIndicator.tsx
    - frontend/src/components/call/IncomingCallBanner.tsx
    - frontend/src/components/call/ActiveCallWindow.tsx
    - frontend/src/components/call/index.ts
  modified: []
decisions:
  - key: "custom-event-for-signaling"
    choice: "Window CustomEvent dispatch"
    reason: "Decouples signaling from useMessaging WebSocket"
  - key: "draggable-minimized-window"
    choice: "Mouse event position tracking"
    reason: "Simple drag implementation without external library"
  - key: "keyboard-shortcuts"
    choice: "Space for mute, Escape for hangup"
    reason: "Standard call app shortcuts"
metrics:
  duration: "3m 33s"
  completed: "2026-01-28"
---

# Phase 3 Plan 05: Call Hook and UI Summary

Call orchestration hook (useCall) and complete call UI component suite for voice calls.

## One-liner

useCall hook orchestrates WebRTC calls with quality monitoring; UI components provide incoming banner, active call window with minimize, and keyboard shortcuts.

## What Was Built

### Task 1: useCall Orchestration Hook (725 lines)

**File:** `frontend/src/lib/webrtc/useCall.ts`

The main call orchestration hook that coordinates:
- **Call lifecycle:** startCall, acceptCall, rejectCall, hangup
- **PeerConnection management:** Creates and destroys WebRTC connections
- **Quality monitoring:** Polls getStats() every 1s for packet loss and RTT
- **Mute control:** Track enable/disable for local audio
- **Signaling integration:** Custom event system for call messages

Key implementation details:
- Uses custom event `call-signaling` for message dispatch
- Lexicographic user ID comparison for polite role (consistent with key exchange)
- Ring timeout with auto-hangup/reject (configurable via settingsStore)
- ICE restart on connection failure
- Quality calculation: 4 bars (excellent) to 1 bar (poor) based on loss/RTT

```typescript
interface UseCallReturn {
  status: CallStatus
  remoteUsername: string | null
  isMuted: boolean
  quality: 1 | 2 | 3 | 4
  latency: number | null
  isMinimized: boolean
  startTime: Date | null

  startCall: (userId: string, username: string) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  hangup: () => void
  toggleMute: () => void
  toggleMinimized: () => void
}
```

### Task 2: Call UI Components

**CallTimer.tsx** (51 lines)
- Displays elapsed call time
- Format: MM:SS or HH:MM:SS if over an hour
- Updates every second via setInterval

**CallQualityIndicator.tsx** (68 lines)
- 4 signal bars with height progression (25%, 50%, 75%, 100%)
- Color coding: green (4-3), yellow (2), red (1)
- Optional latency display (e.g., "45ms")

**CallControls.tsx** (93 lines)
- Mute button with mic icon toggle (Mic/MicOff)
- End call button (red, PhoneOff icon)
- Keyboard shortcuts: Space = mute, Escape = hangup
- Mic activity pulse animation when speaking (micLevel > 15)

**IncomingCallBanner.tsx** (101 lines)
- Fixed position at top of screen (z-50)
- Pulsing avatar with caller name
- Accept (green) and Decline (red) buttons
- Countdown timer showing remaining ring time
- Slide-in animation on appearance

**ActiveCallWindow.tsx** (227 lines)
- **Full page mode:** Centered avatar, name, timer, quality indicator, controls at bottom
- **Minimized mode:** Draggable floating window in bottom-right corner
- Status display: "Calling...", "Connecting...", "Reconnecting..." with spinner
- Speaking indicator ring when mic active

## Verification Results

All must-haves verified:
- [x] useCall exports useCall hook (725 lines, exceeds 200 minimum)
- [x] CallControls exports CallControls component
- [x] IncomingCallBanner exports IncomingCallBanner component
- [x] ActiveCallWindow exports ActiveCallWindow component
- [x] useCall imports from callStore (useCallStore)
- [x] useCall imports from PeerConnection (PeerConnectionManager, createPeerConnection)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Signaling dispatch | Custom window events | Decouples call signaling from messaging WebSocket; allows any component to receive call events |
| Draggable window | Mouse event tracking | Simple implementation without external drag library; bounded to viewport |
| Keyboard shortcuts | Space=mute, Escape=hangup | Standard patterns from popular call apps (Discord, Zoom) |
| Activity threshold | micLevel > 15 | Consistent with 03-04 isActive threshold for speaking detection |

## Commits

1. `f2d2339` feat(03-05): create useCall orchestration hook
2. `b59dcdb` feat(03-05): create call UI components

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/lib/webrtc/useCall.ts` | 725 | Call orchestration hook |
| `frontend/src/components/call/CallControls.tsx` | 93 | Mute and hangup buttons |
| `frontend/src/components/call/CallTimer.tsx` | 51 | Elapsed time display |
| `frontend/src/components/call/CallQualityIndicator.tsx` | 68 | Signal bars indicator |
| `frontend/src/components/call/IncomingCallBanner.tsx` | 101 | Top banner for incoming calls |
| `frontend/src/components/call/ActiveCallWindow.tsx` | 227 | Full and minimized call views |
| `frontend/src/components/call/index.ts` | 5 | Barrel exports |

## Next Phase Readiness

**Blockers:** None

**Ready for 03-06 (Call Integration):**
- useCall hook ready for integration into main app
- All UI components exported and ready for rendering
- Call signaling events can be dispatched from WebSocket handler

**Integration points for 03-06:**
1. Add `dispatchCallSignaling` to useMessaging WebSocket message handler
2. Render `IncomingCallBanner` when callStore.status === 'incoming'
3. Render `ActiveCallWindow` when callStore.status is active (outgoing/connecting/connected/reconnecting)
4. Wire up useCall hook in conversation view for "Call" button

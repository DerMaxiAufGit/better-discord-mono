---
phase: 03-voice-video-calls
plan: 03
subsystem: webrtc-signaling
tags: [webrtc, websocket, signaling, perfect-negotiation, turn]

dependencies:
  requires:
    - "03-01: TURN server credentials API"
    - "03-02: Call store state management"
  provides:
    - "WebSocket call signaling protocol"
    - "PeerConnectionManager with Perfect Negotiation"
    - "Frontend TURN credentials fetching"
  affects:
    - "03-04: Call service integration"
    - "03-05: Audio handling"
    - "03-06: Call UI components"

tech-stack:
  added: []
  patterns:
    - "Perfect Negotiation for WebRTC"
    - "Implicit SDP offer/answer"
    - "ICE candidate trickling"

key-files:
  created:
    - "frontend/src/lib/webrtc/PeerConnection.ts"
  modified:
    - "backend/src/routes/websocket.ts"
    - "frontend/src/lib/api.ts"

decisions:
  - id: "impolite-peer-ignores"
    description: "Impolite peer ignores incoming offer during collision"
    rationale: "Standard Perfect Negotiation pattern from MDN"
  - id: "ice-candidate-silent-drop"
    description: "ICE candidates dropped silently if peer offline"
    rationale: "Unlike offers, candidates are not critical to acknowledge"
  - id: "google-stun-fallback"
    description: "Added Google STUN as fallback in ICE servers"
    rationale: "Provides initial connectivity even if self-hosted STUN unreachable"

metrics:
  duration: "2 minutes"
  completed: "2026-01-28"
---

# Phase 03 Plan 03: WebSocket signaling + PeerConnection Summary

**One-liner:** Extended WebSocket with call signaling and created PeerConnectionManager implementing Perfect Negotiation pattern for collision-free WebRTC connection establishment.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend WebSocket protocol with call signaling | 6014773 | backend/src/routes/websocket.ts |
| 2 | Add TURN credentials to API client | dcfb372 | frontend/src/lib/api.ts |
| 3 | Create PeerConnection manager with Perfect Negotiation | 462853a | frontend/src/lib/webrtc/PeerConnection.ts |

## Changes Made

### Task 1: WebSocket Call Signaling Protocol

Extended the WebSocket message handling to support call signaling:

**New Message Types:**
- `call-offer`: Forward SDP offer with senderId, callId, sdp
- `call-answer`: Forward SDP answer with senderId, callId, sdp
- `call-ice-candidate`: Forward ICE candidate with senderId, callId, candidate
- `call-accept`: Notify caller that callee accepted
- `call-reject`: Notify caller that callee declined
- `call-hangup`: Notify peer that call ended

**Error Handling:**
- Returns `call-error` with `recipient_offline` if target user not connected
- ICE candidates silently dropped if recipient offline (non-critical)
- All call messages require recipientId and callId validation

### Task 2: TURN Credentials Frontend API

Added `turnApi` to the existing API client:

```typescript
export const turnApi = {
  async getCredentials(): Promise<{
    username: string;
    password: string;
    ttl: number;
    uris: string[];
  }>
}
```

Uses existing `fetchWithAuth` for automatic JWT token handling.

### Task 3: PeerConnectionManager with Perfect Negotiation

Created comprehensive WebRTC peer connection manager (311 lines):

**Core Features:**
- Perfect Negotiation pattern for collision handling
- Polite peer backs down on offer collision
- Impolite peer ignores incoming offer during collision
- Implicit SDP creation via parameter-less setLocalDescription()

**API Surface:**
```typescript
class PeerConnectionManager {
  initialize(iceServers: RTCIceServer[]): Promise<void>
  addLocalStream(stream: MediaStream): Promise<void>
  replaceTrack(oldTrack, newTrack): Promise<void>
  handleRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>
  handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void>
  restartIce(): void
  close(): void
  getStats(): Promise<RTCStatsReport | null>
  setAudioEnabled(enabled: boolean): boolean
}

// Factory with automatic TURN credential fetching
async function createPeerConnection(config): Promise<PeerConnectionManager>
```

**ICE Configuration:**
- Self-hosted TURN credentials fetched from backend
- STUN URIs passed through without credentials
- TURN URIs include username/credential
- Google STUN added as fallback

## Decisions Made

1. **Perfect Negotiation Roles**: Lower user ID is polite (will be determined by caller/callee roles in call service)
2. **Implicit SDP**: Using parameter-less setLocalDescription() for cleaner code
3. **Google STUN Fallback**: Added `stun:stun.l.google.com:19302` as additional connectivity option
4. **ICE Candidate Pool**: Set to 10 for faster initial connectivity

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:
- [x] Backend WebSocket handles all call-* message types
- [x] Call signaling messages forwarded only to online recipients
- [x] turnApi.getCredentials() works with authentication
- [x] PeerConnectionManager can be created and initialized
- [x] Perfect Negotiation handles polite/impolite roles
- [x] ICE candidates properly trickled via signaling channel

## Next Phase Readiness

**Ready for 03-04 (Call Service):**
- WebSocket signaling protocol complete
- PeerConnectionManager ready for integration
- TURN credentials fetching available

**Integration Points:**
- Call service will use `createPeerConnection()` to establish connections
- Signaling channel will be backed by WebSocket hook
- Call store will track connection state from onIceConnectionStateChange

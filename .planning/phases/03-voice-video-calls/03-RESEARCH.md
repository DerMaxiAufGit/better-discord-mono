# Phase 3: Voice/Video Calls - Research

**Researched:** 2026-01-28
**Domain:** WebRTC peer-to-peer voice calls with NAT traversal
**Confidence:** HIGH

## Summary

WebRTC (Web Real-Time Communication) is the standard browser API for peer-to-peer audio/video calls. The implementation requires three key components: (1) browser-side RTCPeerConnection API for media handling, (2) WebSocket signaling for SDP/ICE exchange, and (3) self-hosted coturn TURN/STUN server for NAT traversal.

The existing codebase already has WebSocket infrastructure (Fastify @fastify/websocket backend, React frontend) with connection tracking via Map (O(1) lookup), JWT auth via query param, and 3-second reconnect delay. The phase will extend WebSocket message types to include call signaling (offer, answer, ICE candidates, hangup) while maintaining the same architecture.

For audio-only calls, the browser's native WebRTC stack provides built-in echo cancellation, noise suppression, and auto-gain control. No external libraries are required for the core WebRTC implementation—the native browser APIs (RTCPeerConnection, getUserMedia, MediaDevices) provide everything needed. The "Perfect Negotiation" pattern (official MDN recommendation) simplifies peer connection setup by separating negotiation logic from application logic.

**Primary recommendation:** Use native WebRTC APIs with Perfect Negotiation pattern, extend existing WebSocket for signaling, self-host coturn in Docker with REST API auth, and implement getStats()-based quality monitoring.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native WebRTC API | Browser built-in | Peer connections, media streams | W3C standard, no library needed |
| RTCPeerConnection | Browser built-in | P2P connection management | Core WebRTC API |
| getUserMedia | Browser built-in | Audio device access | MediaDevices API standard |
| coturn | 4.6.3+ | TURN/STUN server | Official open-source TURN implementation |
| @fastify/websocket | 11.2.0 (existing) | Signaling channel | Already in use for messaging |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript DOM types | Built-in (lib.dom.d.ts) | RTCPeerConnection type definitions | Already available in TypeScript |
| Zustand | 5.0.0 (existing) | Call state management | Already in use for app state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native WebRTC | simple-peer library | simple-peer abstracts WebRTC but adds 12KB bundle size and hides details needed for quality monitoring |
| coturn | Public STUN servers | Never rely on public servers—they're unreliable and privacy-hostile; self-hosting is mandatory |
| Perfect Negotiation | Custom offer/answer logic | Custom logic requires handling race conditions manually; Perfect Negotiation is the official recommended pattern |

**Installation:**

Coturn (Docker):
```bash
docker run -d --name coturn \
  -p 3478:3478 -p 3478:3478/udp \
  -p 5349:5349 -p 5349:5349/udp \
  -p 49152-65535:49152-65535/udp \
  coturn/coturn:4.6.3
```

No frontend dependencies needed—WebRTC is browser built-in.

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── lib/
│   └── webrtc/
│       ├── PeerConnection.ts      # RTCPeerConnection wrapper with Perfect Negotiation
│       ├── useCall.ts             # React hook for call state management
│       └── useAudioDevices.ts     # Device enumeration and selection
├── stores/
│   └── callStore.ts               # Zustand store for call state (active calls, quality metrics)
└── components/
    ├── CallControls.tsx           # Mute, speaker, end call buttons
    ├── IncomingCallBanner.tsx     # Top-of-screen notification
    └── ActiveCallWindow.tsx       # Full-page/floating call UI

backend/src/
├── routes/
│   └── websocket.ts               # Extend with call signaling message types
├── services/
│   └── turnService.ts             # Generate time-limited TURN credentials
└── routes/
    └── turn.ts                    # REST endpoint for TURN credentials
```

### Pattern 1: Perfect Negotiation Pattern

**What:** Official MDN-recommended pattern for WebRTC peer connection setup that separates negotiation from application logic using "polite" and "impolite" peer roles.

**When to use:** All peer connection setups (this is the standard approach for WebRTC in 2026).

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation

const polite = true; // One peer is polite, other is impolite
let makingOffer = false;
let ignoreOffer = false;
let isSettingRemoteAnswerPending = false;

// Handle negotiation needed (create and send offer)
pc.onnegotiationneeded = async () => {
  try {
    makingOffer = true;
    await pc.setLocalDescription();
    signaler.send({ description: pc.localDescription });
  } catch (err) {
    console.error(err);
  } finally {
    makingOffer = false;
  }
};

// Handle incoming signaling messages
signaler.onmessage = async ({ data: { description, candidate } }) => {
  try {
    if (description) {
      // Detect offer collision
      const readyForOffer =
        !makingOffer &&
        (pc.signalingState === "stable" || isSettingRemoteAnswerPending);
      const offerCollision = description.type === "offer" && !readyForOffer;

      // Polite peer backs down, impolite peer ignores collision
      ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) return;

      isSettingRemoteAnswerPending = description.type === "answer";
      await pc.setRemoteDescription(description);
      isSettingRemoteAnswerPending = false;

      // Send answer if we received an offer
      if (description.type === "offer") {
        await pc.setLocalDescription();
        signaler.send({ description: pc.localDescription });
      }
    } else if (candidate) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        if (!ignoreOffer) throw err;
      }
    }
  } catch (err) {
    console.error(err);
  }
};
```

### Pattern 2: Signaling Message Types (Extend Existing WebSocket)

**What:** WebSocket message protocol for exchanging SDP offers/answers and ICE candidates.

**When to use:** All WebRTC peer connection signaling.

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling

// Extend existing IncomingMessage type in backend/src/routes/websocket.ts
interface IncomingMessage {
  // Existing types
  type: 'message' | 'typing' | 'read' |
        // New call signaling types
        'call-offer' | 'call-answer' | 'call-ice-candidate' | 'call-hangup';

  // Existing fields
  recipientId?: string;
  encryptedContent?: string;

  // New call fields
  callId?: string;           // Unique call identifier
  sdp?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
}

// Frontend sends offer
ws.send(JSON.stringify({
  type: 'call-offer',
  recipientId: contactId,
  callId: generateCallId(),
  sdp: pc.localDescription,
}));

// Backend forwards to recipient if online
const recipientSocket = activeConnections.get(msg.recipientId);
if (recipientSocket) {
  recipientSocket.send(JSON.stringify({
    type: 'call-offer',
    senderId: userId,
    callId: msg.callId,
    sdp: msg.sdp,
  }));
}
```

### Pattern 3: Audio-Only Constraints with Processing

**What:** getUserMedia constraints for audio-only calls with echo cancellation and noise suppression enabled.

**When to use:** All audio stream acquisition (call start, device change).

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

const constraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Optional: specific device
    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
  },
  video: false, // Phase 3 is audio-only
};

const stream = await navigator.mediaDevices.getUserMedia(constraints);

// Add tracks to peer connection
stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
});
```

### Pattern 4: Connection Quality Monitoring with getStats()

**What:** Use RTCPeerConnection.getStats() to monitor audio quality, packet loss, jitter, and RTT.

**When to use:** Active calls—poll every 1-2 seconds for quality indicators.

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats

async function monitorConnectionQuality(pc: RTCPeerConnection) {
  const stats = await pc.getStats(null);

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      const packetsLost = report.packetsLost;
      const packetsReceived = report.packetsReceived;
      const jitter = report.jitter;
      const lossRate = packetsLost / (packetsLost + packetsReceived);

      // Update quality indicator (1-4 bars)
      const quality = lossRate < 0.01 ? 4 :
                      lossRate < 0.05 ? 3 :
                      lossRate < 0.10 ? 2 : 1;

      updateCallQuality(quality);
    }

    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      const rtt = report.currentRoundTripTime * 1000; // Convert to ms
      updateLatency(rtt);
    }
  });
}

// Poll every 1000ms during active call
const qualityInterval = setInterval(() => monitorConnectionQuality(pc), 1000);
```

### Pattern 5: Audio Device Selection and Switching

**What:** Enumerate devices, let user select, and update active streams.

**When to use:** Settings page, in-call device switching.

**Example:**
```typescript
// Source: https://webrtc.org/getting-started/media-devices

// Enumerate devices
async function getAudioDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const inputs = devices.filter(d => d.kind === 'audioinput');
  const outputs = devices.filter(d => d.kind === 'audiooutput');

  return { inputs, outputs };
}

// Listen for device changes (USB headset plugged in, etc.)
navigator.mediaDevices.addEventListener('devicechange', async () => {
  const devices = await getAudioDevices();
  updateDeviceList(devices);
});

// Switch microphone during call
async function switchMicrophone(pc: RTCPeerConnection, deviceId: string) {
  const newStream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId } },
  });

  const audioTrack = newStream.getAudioTracks()[0];
  const sender = pc.getSenders().find(s => s.track?.kind === 'audio');

  if (sender) {
    await sender.replaceTrack(audioTrack); // No renegotiation needed
  }
}

// Switch speaker (output device)
async function switchSpeaker(audioElement: HTMLAudioElement, deviceId: string) {
  // TypeScript: setSinkId is on HTMLMediaElement
  if ('setSinkId' in audioElement) {
    await (audioElement as any).setSinkId(deviceId);
  }
}
```

### Pattern 6: ICE Connection State Monitoring and Reconnection

**What:** Monitor iceConnectionState and trigger ICE restart on failure.

**When to use:** All active calls—detect disconnection and attempt recovery.

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState

pc.oniceconnectionstatechange = () => {
  const state = pc.iceConnectionState;

  switch (state) {
    case 'connected':
    case 'completed':
      setCallStatus('connected');
      break;

    case 'disconnected':
      // Temporary network interruption—may recover
      setCallStatus('reconnecting');
      startReconnectTimeout(10000); // 10s timeout
      break;

    case 'failed':
      // Permanent failure—attempt ICE restart
      console.log('ICE connection failed, restarting ICE');
      pc.restartIce();
      break;

    case 'closed':
      // Call ended
      cleanupCall();
      break;
  }
};
```

### Pattern 7: TURN Credential Generation (Backend)

**What:** Generate time-limited TURN credentials using REST API pattern for coturn.

**When to use:** Before establishing peer connection—frontend requests credentials from backend.

**Example:**
```typescript
// Source: https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00
// coturn REST API specification

// Backend: Generate time-limited credentials
import crypto from 'crypto';

interface TurnCredentials {
  username: string;
  password: string;
  ttl: number;
  uris: string[];
}

function generateTurnCredentials(userId: string, ttl: number = 3600): TurnCredentials {
  const secret = process.env.TURN_SECRET!; // Static secret configured in coturn
  const timestamp = Math.floor(Date.now() / 1000) + ttl;

  // Username format: timestamp:userId
  const username = `${timestamp}:${userId}`;

  // Password: HMAC-SHA1(secret, username)
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(username);
  const password = hmac.digest('base64');

  return {
    username,
    password,
    ttl,
    uris: [
      `turn:${process.env.TURN_SERVER_HOST}:3478?transport=udp`,
      `turn:${process.env.TURN_SERVER_HOST}:3478?transport=tcp`,
      `turns:${process.env.TURN_SERVER_HOST}:5349?transport=tcp`,
    ],
  };
}

// Frontend: Request and use credentials
async function getIceServers(): Promise<RTCIceServer[]> {
  const response = await fetch('/api/turn/credentials');
  const creds: TurnCredentials = await response.json();

  return [
    {
      urls: creds.uris,
      username: creds.username,
      credential: creds.password,
    },
  ];
}

// Use in RTCPeerConnection
const iceServers = await getIceServers();
const pc = new RTCPeerConnection({ iceServers });
```

### Anti-Patterns to Avoid

- **Testing only on localhost with two tabs:** Always test across real networks (different WiFi, mobile, NAT). Localhost bypasses all NAT traversal issues. ([Source](https://bloggeek.me/common-beginner-mistakes-in-webrtc/))

- **Using public STUN/TURN servers:** Never rely on free public servers—they're unreliable, track users, and often offline. Always self-host. ([Source](https://bloggeek.me/common-beginner-mistakes-in-webrtc/))

- **Ignoring ICE candidate timing:** Must call `addIceCandidate()` **after** `setRemoteDescription()`. Adding candidates before causes errors. ([Source](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling))

- **Not handling offer collisions:** When both peers send offers simultaneously, you must have a tiebreaker (polite/impolite roles). Perfect Negotiation solves this. ([Source](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation))

- **Forgetting to stop media tracks on cleanup:** Always call `track.stop()` on all MediaStreamTracks when ending call—otherwise camera/mic stays active. ([Source](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling))

- **Using static TURN credentials:** TURN credentials must be time-limited and generated per-call. Static credentials enable abuse. ([Source](https://github.com/coturn/coturn))

- **Not monitoring connection state:** WebRTC connections can fail silently. Always watch `iceConnectionState` and implement reconnection logic. ([Source](https://www.webrtc-developers.com/anatomy-of-a-webrtc-connection/))

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NAT traversal | Custom UDP hole-punching | Coturn TURN/STUN server | NAT types (symmetric, cone, etc.) require complex ICE protocol; coturn implements RFC 5766 correctly |
| Offer collision handling | Custom negotiation state machine | Perfect Negotiation pattern | Race conditions between simultaneous offers require ICE rollback and careful state tracking—Perfect Negotiation is battle-tested |
| Audio echo cancellation | Custom DSP processing | Browser built-in `echoCancellation: true` | WebRTC's AEC (Acoustic Echo Cancellation) is hardware-accelerated and handles acoustic echo, not just line echo |
| Connection quality metrics | Parse raw RTP packets | `RTCPeerConnection.getStats()` | Stats API exposes 50+ metrics (jitter, packet loss, RTT, bitrate) without parsing binary protocols |
| Device enumeration | Manual device detection | `navigator.mediaDevices.enumerateDevices()` | Cross-browser device labels, permissions handling, and change detection built-in |
| Credential generation for TURN | Custom auth protocol | TURN REST API (RFC draft) | Time-limited HMAC-based credentials prevent abuse and are supported natively by coturn |

**Key insight:** WebRTC's complexity is hidden behind well-designed browser APIs. Don't re-implement what browsers provide—focus on signaling and UI instead.

## Common Pitfalls

### Pitfall 1: ICE Gathering Never Completes

**What goes wrong:** `iceGatheringState` stays stuck at "gathering" and peer connection never establishes.

**Why it happens:** Missing or misconfigured STUN/TURN servers in `RTCPeerConnection` config. Without STUN, the browser can't discover its public IP; without TURN, symmetric NAT blocks connection.

**How to avoid:**
- Always configure ICE servers before creating peer connection
- Test with `iceServers: []` locally, but production must have self-hosted TURN
- Verify coturn is reachable: `nc -zv <turn-host> 3478`

**Warning signs:**
- `iceGatheringState` never transitions to "complete"
- `iceConnectionState` stuck at "checking"
- No `onicecandidate` events fired

### Pitfall 2: Audio Works Locally but Not Across Networks

**What goes wrong:** Call connects successfully on localhost (two browser tabs) but fails between users on different networks.

**Why it happens:** Localhost bypasses NAT traversal entirely—both peers use `127.0.0.1` candidates. Real networks require STUN to discover public IPs and TURN to relay when direct connection fails.

**How to avoid:**
- Never rely solely on localhost testing
- Test with at least one peer behind NAT (home WiFi, mobile network)
- Monitor ICE candidate types: `host` (local), `srflx` (STUN), `relay` (TURN)
- If only `host` candidates appear, STUN/TURN config is wrong

**Warning signs:**
- Works on same WiFi, fails on different networks
- No `srflx` or `relay` candidates in ICE candidate logs
- `iceConnectionState` goes to `failed` immediately after `checking`

### Pitfall 3: Echo Heard by Remote Peer

**What goes wrong:** Remote user hears their own voice delayed (acoustic echo).

**Why it happens:** Audio from speakers feeds back into microphone. This happens when `echoCancellation: false` or when user has speaker volume too high.

**How to avoid:**
- Always enable `echoCancellation: true` in getUserMedia constraints
- Provide speaker volume control in UI
- Consider headphone detection (if speaker is used, suggest headphones)
- Test with audio output device selection (some devices have better EC than others)

**Warning signs:**
- User reports hearing themselves
- Echo worse with external speakers vs. headphones
- Echo delay matches network RTT (round-trip time)

### Pitfall 4: Connection Drops Without Notification

**What goes wrong:** WebRTC connection silently fails; UI still shows "connected" but no audio is transmitted.

**Why it happens:** Network interruption (WiFi handoff, mobile data switch) breaks ICE connection. If `oniceconnectionstatechange` not monitored, app doesn't detect failure.

**How to avoid:**
- Always listen to `iceconnectionstatechange` event
- Treat `disconnected` as temporary (10s timeout), `failed` as permanent
- Implement automatic ICE restart with `pc.restartIce()` on failure
- Monitor `getStats()` for zero packets received/sent as backup detection

**Warning signs:**
- User switches WiFi networks and call doesn't recover
- Mobile user walks out of WiFi range—call hangs instead of reconnecting
- `iceConnectionState` shows `disconnected` or `failed` but UI shows "connected"

### Pitfall 5: Microphone Permission Prompt During Call Start

**What goes wrong:** User clicks "Start Call" and browser shows permission prompt. They deny accidentally or get confused, call fails to start.

**Why it happens:** Requesting microphone permission for the first time during call creates poor UX. User expects instant call, gets permission dialog instead.

**How to avoid:**
- Request microphone permission proactively in settings/onboarding flow
- Show "Test Microphone" feature before first call
- Check permission state with `navigator.permissions.query({ name: 'microphone' })`
- If permission denied, show clear UI explaining how to grant access

**Warning signs:**
- High rate of failed call starts
- Users complain about "call button not working"
- Permission denied errors in console

### Pitfall 6: TURN Credentials Expired Mid-Call

**What goes wrong:** Call starts successfully but drops after `ttl` seconds when TURN credentials expire.

**Why it happens:** TURN credentials have finite lifetime (typically 1-24 hours). If ICE restart happens after expiry, new credentials can't be obtained mid-call.

**How to avoid:**
- Set TURN credential TTL longer than expected call duration (e.g., 24 hours)
- For long calls, refresh credentials proactively and call `pc.setConfiguration()` with new ICE servers
- Alternative: use coturn's static credentials mode (less secure but no expiry)

**Warning signs:**
- Calls drop exactly at TTL boundary (e.g., 1 hour)
- ICE restart fails with auth errors in coturn logs
- More common for relay candidates than direct connections

### Pitfall 7: Not Cleaning Up Media Tracks on Call End

**What goes wrong:** After call ends, microphone indicator (browser tab or OS) stays on. User's microphone remains active.

**Why it happens:** Calling `pc.close()` doesn't automatically stop MediaStreamTracks. Tracks must be stopped explicitly.

**How to avoid:**
```typescript
function cleanupCall() {
  // Stop all local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // Stop all remote tracks
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  // Close peer connection
  if (pc) {
    pc.close();
  }
}
```

**Warning signs:**
- Microphone icon stays lit after call ends
- User reports privacy concern (mic still active)
- Memory leak—multiple MediaStreams accumulate

## Code Examples

Verified patterns from official sources:

### Basic RTCPeerConnection Setup with ICE Servers

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection

const config: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'turn:turn.example.com:3478?transport=udp',
        'turn:turn.example.com:3478?transport=tcp',
      ],
      username: 'time-limited-username',
      credential: 'hmac-password',
    },
  ],
};

const pc = new RTCPeerConnection(config);

// Set up event handlers
pc.onicecandidate = (event) => {
  if (event.candidate) {
    sendToRemotePeer({ type: 'ice-candidate', candidate: event.candidate });
  }
};

pc.ontrack = (event) => {
  const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement;
  remoteAudio.srcObject = event.streams[0];
};

pc.oniceconnectionstatechange = () => {
  console.log('ICE connection state:', pc.iceConnectionState);
};
```

### Starting an Audio-Only Call

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling

async function startCall(remotePeerId: string) {
  // Get local audio stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  // Add tracks to peer connection
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });

  // Display local audio (for mic test UI)
  const localAudio = document.getElementById('local-audio') as HTMLAudioElement;
  localAudio.srcObject = stream;
  localAudio.muted = true; // Don't play own audio

  // Perfect Negotiation will handle offer creation via onnegotiationneeded
}
```

### Handling Incoming Call

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling

async function acceptCall() {
  // Get local audio stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: false,
  });

  // Add tracks
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });

  // Perfect Negotiation handles answer creation automatically
  // when remote offer is set via setRemoteDescription
}
```

### Muting/Unmuting Microphone

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack

function toggleMute() {
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    return audioTrack.enabled;
  }
  return false;
}

// Alternative: track.stop() ends track permanently
// track.enabled = false temporarily disables (preferred for mute)
```

### Detecting Microphone Activity (Visual Indicator)

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode

function setupMicActivityIndicator(stream: MediaStream) {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);

  microphone.connect(analyser);
  analyser.fftSize = 256;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function checkLevel() {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    // Update UI indicator (e.g., pulse mic icon when average > 20)
    updateMicIndicator(average > 20);

    requestAnimationFrame(checkLevel);
  }

  checkLevel();
}
```

### Ending Call and Cleanup

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling

function hangUp() {
  // Send hangup signal to remote peer
  sendToRemotePeer({ type: 'call-hangup' });

  // Stop all local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // Close peer connection
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.oniceconnectionstatechange = null;
    pc.close();
    pc = null;
  }

  // Clear UI
  const remoteAudio = document.getElementById('remote-audio') as HTMLAudioElement;
  remoteAudio.srcObject = null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual offer/answer negotiation | Perfect Negotiation pattern | 2020 | Eliminates glare (offer collision) handling complexity; same code for both peers |
| Static TURN credentials | REST API time-limited credentials | 2013 (RFC draft) | Prevents credential abuse; credentials auto-expire |
| Unified Plan vs Plan B SDP | Unified Plan only | 2020 (Chrome 72+) | Plan B deprecated; Unified Plan is only supported format |
| Legacy `getUserMedia()` (navigator.getUserMedia) | Modern `navigator.mediaDevices.getUserMedia()` | 2017 | Promise-based API; old callback style removed from browsers |
| `getStats()` legacy callback API | Promise-based `getStats()` | 2017 | Standardized stats format (RTCStatsReport); old format deprecated |

**Deprecated/outdated:**
- **Plan B SDP format:** Removed from Chrome 96+ (2021). Only Unified Plan supported.
- **navigator.getUserMedia (callback-based):** Removed from modern browsers. Use `navigator.mediaDevices.getUserMedia()`.
- **addStream/removeStream:** Deprecated in favor of `addTrack/removeTrack` (per-track control).
- **Public STUN servers (stun.l.google.com):** While still technically working, relying on them is anti-pattern. Self-host STUN/TURN.

## Open Questions

Things that couldn't be fully resolved:

1. **Browser-specific Audio Processing Differences**
   - What we know: Chrome and Firefox implement different AEC algorithms; Chrome's is generally considered better
   - What's unclear: Whether Safari's AEC quality matches Chrome/Firefox (testing needed)
   - Recommendation: Implement audio quality feedback mechanism ("How was the call quality?") to detect issues

2. **Optimal getStats() Polling Interval**
   - What we know: Common practice is 1-2 seconds for quality monitoring
   - What's unclear: Impact on performance, especially mobile devices (CPU/battery)
   - Recommendation: Start with 1000ms, provide setting to reduce to 2000ms if performance issues

3. **ICE Restart Success Rate**
   - What we know: Sources claim "two-thirds of cases" for successful ICE restart after failure
   - What's unclear: Factors that determine success (NAT type, network conditions, browser)
   - Recommendation: Log ICE restart attempts and success rates to gather real-world data; implement fallback "Please hang up and try again" if restart fails

4. **Coturn Performance Limits**
   - What we know: Coturn claims "thousands simultaneous calls per CPU" for TURN relay
   - What's unclear: Actual limits depend on bitrate, codec, server specs (vague guidance)
   - Recommendation: Start with single coturn instance; monitor with Prometheus and scale horizontally if needed

## Sources

### Primary (HIGH confidence)

- [MDN: WebRTC API - Signaling and Video Calling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling) - Core signaling flow and SDP exchange
- [MDN: WebRTC API - Protocols](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols) - ICE, STUN, TURN, SDP explained
- [MDN: WebRTC API - Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) - Official recommended pattern
- [MDN: RTCPeerConnection.getStats()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats) - Connection quality monitoring
- [MDN: RTCPeerConnection.iceConnectionState](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState) - Connection state monitoring
- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - Media stream acquisition
- [WebRTC.org: Getting Started with Media Devices](https://webrtc.org/getting-started/media-devices) - Official device enumeration guide
- [GitHub: coturn/coturn](https://github.com/coturn/coturn) - Official coturn repository
- [W3C: WebRTC Statistics API](https://www.w3.org/TR/webrtc-stats/) - Official stats specification
- [IETF: TURN REST API Draft](https://datatracker.ietf.org/doc/html/draft-uberti-behave-turn-rest-00) - Time-limited credential spec

### Secondary (MEDIUM confidence)

- [WebRTC.ventures: Self-Hosted STUN/TURN Setup (Jan 2025)](https://webrtc.ventures/2025/01/how-to-set-up-self-hosted-stun-turn-servers-for-webrtc-applications/) - Recent production setup guide
- [Mozilla Blog: WebRTC Speaker Selection (Jul 2025)](https://blog.mozilla.org/webrtc/how-webrtc-speaker-selection-works/) - Audio output device selection
- [Metered.ca: CoTURN in Docker Guide](https://www.metered.ca/blog/running-coturn-in-docker-a-step-by-step-guide/) - Docker deployment verified with official coturn docs
- [BlogGeek.me: Common WebRTC Mistakes](https://bloggeek.me/common-beginner-mistakes-in-webrtc/) - Industry expert (Tsahi Levent-Levi) pitfalls guide
- [WebRTC for Developers: GetUserMedia Constraints](https://www.webrtc-developers.com/getusermedia-constraints-explained/) - Constraints verified with MDN docs

### Tertiary (LOW confidence)

- WebSearch results for "WebRTC 2026" trends—mostly marketing content, not authoritative
- Various Stack Overflow discussions—used to identify common problems but not as primary source
- Community blog posts about WebRTC setup—cross-verified with official docs before inclusion

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All recommendations from official W3C/MDN documentation and established open-source projects
- Architecture: **HIGH** - Perfect Negotiation is official MDN pattern; patterns verified in production WebRTC apps
- Pitfalls: **HIGH** - Sourced from MDN caveats, WebRTC expert blogs (BlogGeek.me), and official issue trackers

**Research date:** 2026-01-28
**Valid until:** 2026-04-28 (90 days) - WebRTC is stable; major changes rare but monitor browser updates

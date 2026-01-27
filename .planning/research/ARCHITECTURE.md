# Architecture Research

**Domain:** Self-hosted E2E encrypted communication platform
**Researched:** 2026-01-27
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer (Web)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  E2E Crypto  │  │    WebRTC    │          │
│  │  Components  │  │   (libsignal) │  │    Client    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    ┌───────┴────────┐                           │
│                    │  WebSocket     │                           │
│                    │  Connection    │                           │
│                    └───────┬────────┘                           │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                     WSS (encrypted)
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                   Server Layer (Zero-Knowledge)                  │
├────────────────────────────┴─────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   REST API   │  │  WebSocket   │  │   Signaling  │          │
│  │   (Auth)     │  │   Server     │  │   (WebRTC)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────┴──────────────────┴──────────────────┴───────┐         │
│  │           Application Server (Node.js)             │         │
│  └──────────────────────────┬─────────────────────────┘         │
│                             │                                    │
├─────────────────────────────┴─────────────────────────────────┬─┤
│                     Persistence Layer                          │ │
├──────────────────────────────────────────────────────────────┬─┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  PostgreSQL  │  │    Redis     │  │   KeyStore   │       │   │
│  │ (Metadata)   │  │  (Pub/Sub)   │  │ (PreKeys)    │       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘       │   │
└─────────────────────────────────────────────────────────────────┘

Legend:
- Encrypted message content: Only clients can decrypt
- Server metadata: User IDs, timestamps, delivery status (NOT content)
- P2P media: WebRTC goes peer-to-peer after signaling
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Client Crypto Engine** | Generate keys, encrypt/decrypt messages, manage Double Ratchet state | libsignal (Rust compiled to WASM), runs in browser |
| **React UI** | Render chat interface, handle user interactions, manage local state | React + TypeScript, Material UI or Tailwind |
| **WebSocket Client** | Maintain persistent connection, send/receive encrypted messages | Socket.IO client or native WebSocket |
| **WebRTC Client** | Handle P2P call signaling, media streams, screen sharing | Native WebRTC APIs |
| **REST API Server** | User registration, authentication, session management | Express.js or Fastify |
| **WebSocket Server** | Route encrypted messages between users, presence updates | Socket.IO or ws library |
| **WebRTC Signaling Server** | Exchange SDP offers/answers and ICE candidates for P2P setup | Custom WebSocket endpoint |
| **PostgreSQL** | Store user accounts, metadata (sender/recipient/timestamp), NOT message content | PostgreSQL 15+ with encryption at rest |
| **Redis** | Pub/sub for multi-instance message routing, session cache, online presence | Redis 7+ |
| **PreKey Store** | Temporarily store public key bundles for initial key exchange | PostgreSQL table or Redis with TTL |
| **TURN/STUN Server** | NAT traversal for WebRTC when direct P2P fails (~10-15% of calls) | Coturn in Docker |

## Recommended Project Structure

```
project-root/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── auth/          # Login, register
│   │   │   ├── chat/          # Message list, input
│   │   │   ├── call/          # Video/audio call UI
│   │   │   └── common/        # Shared UI components
│   │   ├── crypto/            # E2E encryption layer
│   │   │   ├── signal.ts      # libsignal wrapper
│   │   │   ├── keystore.ts    # Local key management (IndexedDB)
│   │   │   └── protocol.ts    # Double Ratchet state machine
│   │   ├── services/          # API clients
│   │   │   ├── websocket.ts   # WebSocket connection manager
│   │   │   ├── webrtc.ts      # WebRTC peer manager
│   │   │   └── api.ts         # REST API client
│   │   ├── store/             # State management
│   │   │   ├── auth.ts        # Auth state (Zustand/Redux)
│   │   │   ├── messages.ts    # Decrypted message cache
│   │   │   └── calls.ts       # Active call state
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts         # Build config
│
├── server/                    # Backend Node.js app
│   ├── src/
│   │   ├── api/               # REST API routes
│   │   │   ├── auth.ts        # Registration, login
│   │   │   ├── users.ts       # User profile endpoints
│   │   │   └── keys.ts        # PreKey bundle upload/fetch
│   │   ├── websocket/         # WebSocket handlers
│   │   │   ├── server.ts      # Socket.IO setup
│   │   │   ├── messages.ts    # Route encrypted messages
│   │   │   ├── presence.ts    # Online/offline status
│   │   │   └── signaling.ts   # WebRTC signaling
│   │   ├── db/                # Database layer
│   │   │   ├── postgres.ts    # PostgreSQL connection
│   │   │   ├── models/        # User, Message metadata models
│   │   │   └── migrations/    # Schema migrations
│   │   ├── redis/             # Redis client
│   │   │   ├── pubsub.ts      # Message routing across instances
│   │   │   └── cache.ts       # Session/presence cache
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts        # JWT verification
│   │   │   └── ratelimit.ts   # Rate limiting
│   │   └── server.ts          # Main entry point
│   ├── package.json
│   └── tsconfig.json
│
├── docker/                    # Docker configs
│   ├── Dockerfile.client      # Multi-stage build for React
│   ├── Dockerfile.server      # Multi-stage build for Node
│   └── nginx.conf             # Serve static client + reverse proxy
│
├── docker-compose.yml         # Full stack orchestration
├── .env.example               # Environment variables template
└── README.md
```

### Structure Rationale

- **client/crypto/:** Isolated crypto logic makes it easier to audit security-critical code. Keeps encryption keys separate from UI state.
- **server/websocket/:** Dedicated WebSocket layer separates real-time messaging from REST API. Easier to scale horizontally with Redis pub/sub.
- **Monorepo structure:** Client and server in same repo simplifies Docker Compose deployment and shared type definitions.

## Architectural Patterns

### Pattern 1: Zero-Knowledge Server (E2E Encryption)

**What:** Server stores encrypted message blobs and metadata (sender, recipient, timestamp) but cannot read message content. Encryption keys live only on clients.

**When to use:** When privacy is a core requirement. Users must own their data and server operator cannot access conversations.

**Trade-offs:**
- **Pros:** Maximum privacy, server breach doesn't expose content, trust-minimized
- **Cons:** No server-side search, message history tied to devices, complex key backup

**Example:**
```typescript
// Client encrypts before sending
async function sendMessage(recipientId: string, plaintext: string) {
  // Get recipient's Double Ratchet session
  const session = await signalProtocol.getSession(recipientId);

  // Encrypt with Signal protocol
  const ciphertext = await session.encrypt(plaintext);

  // Send encrypted blob to server
  await websocket.emit('message', {
    to: recipientId,
    ciphertext: ciphertext,  // Server cannot read this
    timestamp: Date.now()
  });
}

// Server just routes the blob
socket.on('message', async (data) => {
  // Store encrypted message in DB
  await db.messages.create({
    sender: socket.userId,
    recipient: data.to,
    ciphertext: data.ciphertext,  // Never decrypted server-side
    timestamp: data.timestamp
  });

  // Forward to recipient if online
  io.to(data.to).emit('message', {
    from: socket.userId,
    ciphertext: data.ciphertext,
    timestamp: data.timestamp
  });
});
```

### Pattern 2: Signal Protocol Key Exchange (X3DH + Double Ratchet)

**What:** Asynchronous key agreement allows two clients to establish shared secrets without being online simultaneously. PreKeys uploaded to server enable "out of band" handshake.

**When to use:** For offline-first E2E encrypted messaging. Users can send encrypted messages even if recipient is offline.

**Trade-offs:**
- **Pros:** Works offline, provides forward secrecy and post-compromise security
- **Cons:** Complex state management, requires careful key rotation

**Example:**
```typescript
// Alice (sender) fetches Bob's prekey bundle from server
async function initSession(recipientId: string) {
  const preKeyBundle = await api.get(`/keys/${recipientId}`);

  // X3DH: Generate shared secret from prekeys
  const session = await signalProtocol.processPreKeyBundle(
    recipientId,
    preKeyBundle.identityKey,
    preKeyBundle.signedPreKey,
    preKeyBundle.oneTimePreKey  // Consumed after use
  );

  // Now Double Ratchet session is established
  return session;
}

// Server provides prekey bundles
router.get('/keys/:userId', async (req, res) => {
  const preKeys = await db.prekeys.findOne({
    userId: req.params.userId,
    used: false
  });

  if (preKeys) {
    // Mark one-time key as used
    await db.prekeys.update({ _id: preKeys._id }, { used: true });
  }

  res.json(preKeys);
});
```

### Pattern 3: WebRTC Signaling Server (SDP/ICE Exchange)

**What:** Server acts as message router for WebRTC negotiation (offers, answers, ICE candidates). After signaling, media flows peer-to-peer, bypassing server.

**When to use:** For 1:1 video/audio calls where low latency and bandwidth efficiency matter. Server never sees media content.

**Trade-offs:**
- **Pros:** Low latency, bandwidth stays on user networks, server cost scales with users not calls
- **Cons:** NAT traversal can fail (~10-15% need TURN relay), harder to record/moderate calls

**Example:**
```typescript
// Caller initiates WebRTC offer
async function startCall(recipientId: string) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.example.com:3478' },
      { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
    ]
  });

  // Add local media
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send offer via signaling server
  websocket.emit('webrtc-offer', {
    to: recipientId,
    sdp: offer.sdp
  });

  // Listen for ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      websocket.emit('ice-candidate', {
        to: recipientId,
        candidate: event.candidate
      });
    }
  };
}

// Signaling server just routes messages
socket.on('webrtc-offer', (data) => {
  io.to(data.to).emit('webrtc-offer', {
    from: socket.userId,
    sdp: data.sdp
  });
});

socket.on('ice-candidate', (data) => {
  io.to(data.to).emit('ice-candidate', {
    from: socket.userId,
    candidate: data.candidate
  });
});
```

### Pattern 4: Session-Based Auth with JWT

**What:** Hybrid approach using session tokens for authentication state and short-lived JWTs for API authorization. Sessions stored in Redis for fast revocation.

**When to use:** When you need both stateless API auth (JWT) and ability to quickly revoke access (sessions).

**Trade-offs:**
- **Pros:** Fast revocation, stateless API calls, works with WebSocket auth
- **Cons:** More complex than pure JWT or pure session, requires Redis

**Example:**
```typescript
// Login creates session and issues JWT
router.post('/login', async (req, res) => {
  const user = await db.users.findOne({ username: req.body.username });
  const valid = await bcrypt.compare(req.body.password, user.passwordHash);

  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Create session in Redis
  const sessionId = uuidv4();
  await redis.set(`session:${sessionId}`, user.id, 'EX', 86400); // 24h

  // Issue short-lived JWT
  const jwt = jsonwebtoken.sign(
    { userId: user.id, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ token: jwt, sessionId });
});

// Middleware verifies JWT and checks session still valid
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = jsonwebtoken.verify(token, process.env.JWT_SECRET);

  // Verify session not revoked
  const sessionExists = await redis.exists(`session:${payload.sessionId}`);
  if (!sessionExists) {
    return res.status(401).json({ error: 'Session expired' });
  }

  req.userId = payload.userId;
  next();
}

// Logout invalidates session immediately
router.post('/logout', authenticate, async (req, res) => {
  await redis.del(`session:${req.sessionId}`);
  res.json({ success: true });
});
```

## Data Flow

### Request Flow (Message Sending)

```
[User types message in UI]
    ↓
[React component calls sendMessage]
    ↓
[Crypto layer encrypts with Signal protocol]
    ↓
[WebSocket client emits encrypted blob]
    ↓
    WSS ←→ [Load Balancer/nginx]
    ↓
[WebSocket server receives message]
    ↓
[Store encrypted message in PostgreSQL]
    ↓
[Publish to Redis channel for other server instances]
    ↓
[Forward to recipient's WebSocket if online]
    ↓
    WSS ←→ [Recipient client]
    ↓
[Crypto layer decrypts with Signal protocol]
    ↓
[React UI displays plaintext message]
```

### WebRTC Call Establishment

```
[Caller clicks "Start Call"]
    ↓
[WebRTC creates offer (SDP)]
    ↓
[Send offer via WebSocket signaling]
    ↓
[Server routes offer to callee]
    ↓
[Callee WebRTC creates answer]
    ↓
[Send answer via WebSocket signaling]
    ↓
[Both peers exchange ICE candidates]
    ↓
[ICE negotiation finds network path]
    ↓
[Direct P2P connection established]
    ↓
[Media streams flow peer-to-peer, bypassing server]
```

### Key Data Flows

1. **Authentication flow:** Client → REST API → PostgreSQL → JWT issued → Client stores in memory
2. **Message routing:** Sender → WebSocket → Redis Pub/Sub → All server instances → Recipient
3. **PreKey rotation:** Client uploads new prekeys periodically → Server stores in DB → Other clients fetch for session init
4. **Presence updates:** Client connects → WebSocket stores in Redis SET → Other clients notified via pub/sub

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Docker Compose host with all services. PostgreSQL on same host. Redis as single instance. No TURN needed for most calls. |
| 1k-10k users | Add read replica for PostgreSQL. Redis Sentinel for HA. Deploy 2-3 server instances behind nginx. Add dedicated TURN server. |
| 10k-100k users | PostgreSQL with connection pooling (PgBouncer). Redis Cluster for sharding. Horizontal server scaling with load balancer. CDN for client assets. Separate TURN server cluster. |
| 100k+ users | Consider managed PostgreSQL (RDS/CloudSQL). Separate message storage to TimescaleDB or Cassandra. Multi-region deployment. Media servers (SFU) for group calls. |

### Scaling Priorities

1. **First bottleneck:** WebSocket connections per server instance (~10k concurrent).
   - **Fix:** Horizontal scaling with Redis pub/sub for message routing across instances.

2. **Second bottleneck:** PostgreSQL writes (message metadata inserts).
   - **Fix:** Write buffering with batch inserts, or move to append-only table partitioned by time.

3. **Third bottleneck:** TURN server bandwidth for relayed calls.
   - **Fix:** Deploy regional TURN servers, use ICE priority to prefer direct P2P.

## Anti-Patterns

### Anti-Pattern 1: Server-Side Message Decryption

**What people do:** Store encryption keys on server to enable search/indexing or because "it's easier."

**Why it's wrong:** Defeats entire purpose of E2E encryption. Server breach exposes all messages. Violates zero-knowledge principle.

**Do this instead:** Keep keys only on clients. Use local search on device. If server search needed, use client-side encrypted search indexes (like Signal's Encrypted Search).

### Anti-Pattern 2: Storing PreKeys Indefinitely

**What people do:** Generate one set of prekeys per user and reuse forever.

**Why it's wrong:** Breaks forward secrecy. If a prekey is compromised, attacker can decrypt all sessions initiated with that prekey.

**Do this instead:** One-time prekeys are consumed after single use. Client uploads new batches periodically. Signed prekey rotates every ~7 days.

### Anti-Pattern 3: WebSocket for Media Streams

**What people do:** Route video/audio through WebSocket server to "simplify architecture."

**Why it's wrong:** Server becomes bandwidth bottleneck. Latency increases. Server costs scale with call duration instead of users. No end-to-end encryption for media.

**Do this instead:** Use WebRTC with server only for signaling. Media flows peer-to-peer. Use TURN relay only as fallback (~10-15% of calls).

### Anti-Pattern 4: Global Shared Secret for JWT

**What people do:** Use same JWT secret across all environments, hardcode it in code, or use weak secrets.

**Why it's wrong:** Secret leak allows attacker to forge any user token. No rotation strategy means breach is permanent.

**Do this instead:** Generate strong random secrets per environment. Store in environment variables or secrets manager. Rotate regularly. Use asymmetric keys (RS256) if possible.

### Anti-Pattern 5: No Rate Limiting

**What people do:** Assume E2E encryption makes spam/abuse impossible since server can't read messages.

**Why it's wrong:** Server still sees metadata (who sends to whom, frequency). Attackers can spam connection attempts, exhaust prekeys, or flood with encrypted garbage.

**Do this instead:** Rate limit by user ID and IP. Limit messages per minute, connection attempts, prekey fetches. Use challenge-response for registration (CAPTCHA).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| STUN/TURN servers | WebRTC ICE configuration | Coturn in Docker, need UDP ports 49152-65535 for TURN. Configure in client RTCPeerConnection. |
| Email service | SMTP or API (SendGrid) | For account verification, password reset. Optional for self-hosted. |
| Push notifications | FCM (Firebase) or APNS | Future mobile support. Server sends notification with encrypted payload. |
| CDN | nginx/Cloudflare | Serve client assets, SSL termination. Docker nginx container in docker-compose. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client ↔ Server REST API | HTTPS/JSON | Authentication, user management, prekey upload/fetch. JWT in Authorization header. |
| Client ↔ WebSocket | WSS (Socket.IO) | Encrypted messages, presence, signaling. Authenticate with JWT on connection. |
| Server ↔ PostgreSQL | TCP connection pool | Store user accounts, message metadata, prekeys. Use PgBouncer for pooling. |
| Server ↔ Redis | TCP (Redis protocol) | Pub/sub for message routing, session cache, presence tracking. Use Redis Sentinel for HA. |
| Client ↔ Client (WebRTC) | P2P via STUN/TURN | Media streams after signaling. DTLS-SRTP encrypted. |

## Docker Compose Deployment Structure

### Container Architecture

```yaml
services:
  # Frontend (built React app served by nginx)
  client:
    - Serves static assets
    - Reverse proxies /api → server
    - Terminates SSL
    - Ports: 80, 443

  # Backend (Node.js)
  server:
    - REST API + WebSocket server
    - Connects to postgres + redis
    - Env: DATABASE_URL, REDIS_URL, JWT_SECRET
    - Ports: 3000 (internal)

  # Database
  postgres:
    - Stores users, message metadata, prekeys
    - Volume for persistence
    - Ports: 5432 (internal)

  # Cache + Pub/Sub
  redis:
    - Session cache, presence, message routing
    - Volume for AOF persistence
    - Ports: 6379 (internal)

  # NAT traversal for WebRTC
  coturn:
    - STUN/TURN server for calls
    - Network mode: host (needs UDP ports)
    - Config: /etc/coturn/turnserver.conf
```

### Network Flow

```
Internet
    ↓
  :443 (HTTPS/WSS)
    ↓
┌─────────┐
│ nginx   │ ← TLS termination
│ (client)│
└─────────┘
    ↓ /api → :3000
┌─────────┐
│ server  │ ← WebSocket + REST
└─────────┘
    ↓          ↓
:5432      :6379
    ↓          ↓
┌─────────┐ ┌─────────┐
│postgres │ │  redis  │
└─────────┘ └─────────┘

Separate network for WebRTC:
┌─────────┐
│ coturn  │ :3478, :5349, :49152-65535 UDP
└─────────┘
    ↑
    └─── Clients connect directly for TURN relay
```

### Build Order Dependencies

1. **Phase 1 - Foundation:**
   - PostgreSQL + Redis containers (no dependencies)
   - Server skeleton with basic Express app
   - Can test database connections

2. **Phase 2 - Authentication:**
   - Depends on PostgreSQL
   - Implements user registration, login, JWT
   - Client can test login flow

3. **Phase 3 - Messaging Infrastructure:**
   - Depends on Phase 2 (auth)
   - WebSocket server + Redis pub/sub
   - Client crypto layer (libsignal)
   - Prekey upload/fetch endpoints

4. **Phase 4 - E2E Encrypted Messaging:**
   - Depends on Phase 3
   - Signal protocol integration on client
   - Message send/receive with encryption
   - Cannot test until both client crypto + server websocket work

5. **Phase 5 - WebRTC Calls:**
   - Depends on Phase 3 (WebSocket signaling)
   - Add Coturn container
   - Can develop in parallel with Phase 4

6. **Phase 6 - Polish:**
   - Depends on all previous phases
   - UI improvements, error handling
   - No infrastructure changes

**Critical Path:** PostgreSQL → Auth → WebSocket + Crypto → Messaging
**Parallel Path:** Coturn + WebRTC (can develop alongside messaging)

## Sources

- [IETF MLS Architecture](https://www.ietf.org/blog/mls-secure-and-usable-end-to-end-encryption/)
- [Signal Double Ratchet Specification](https://signal.org/docs/specifications/doubleratchet/)
- [MDN WebRTC Signaling Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)
- [Matrix Protocol Documentation](https://matrix.org/docs/older/understanding-synapse-hosting/)
- [WebRTC NAT Traversal (STUN/TURN)](https://webrtc.link/en/articles/stun-turn-servers-webrtc-nat-traversal/)
- [Signal Security Architecture](https://profincognito.me/blog/security/signal-security-architecture/)
- [Coturn GitHub Repository](https://github.com/coturn/coturn)
- [JWT Security Best Practices 2026](https://curity.io/resources/learn/jwt-best-practices/)
- [Self-hosted E2E Encrypted Platforms](https://www.contus.com/blog/best-self-hosted-chat-platforms/)

---
*Architecture research for: Self-hosted E2E encrypted communication platform*
*Researched: 2026-01-27*

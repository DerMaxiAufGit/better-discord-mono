---
phase: 03-voice-video-calls
plan: 01
title: TURN/STUN Server Setup
subsystem: voice-infrastructure
tags: [coturn, webrtc, turn, stun, nat-traversal]

dependency-graph:
  requires:
    - 01-foundation-deployment
    - backend-fastify-jwt
  provides:
    - coturn-docker-service
    - turn-credentials-api
    - nat-traversal-capability
  affects:
    - 03-02-signaling
    - 03-03-webrtc-peer-connections

tech-stack:
  added:
    - coturn/coturn:4.6.3
  patterns:
    - HMAC-SHA1 time-limited credentials
    - REST API credential generation

file-tracking:
  created:
    - backend/src/services/turnService.ts
    - backend/src/routes/turn.ts
  modified:
    - docker-compose.yml
    - .env.example
    - backend/src/server.ts

decisions:
  - id: coturn-4.6.3
    choice: "Use coturn:4.6.3 Docker image"
    rationale: "Latest stable version with good Docker support"
  - id: limited-port-range
    choice: "Use 49152-49200 port range instead of full 49152-65535"
    rationale: "Docker performance degrades with large port ranges; 49 ports sufficient for development"
  - id: rest-api-auth
    choice: "HMAC-SHA1 time-limited credentials"
    rationale: "RFC-compliant, prevents credential abuse, standard coturn auth method"
  - id: 24-hour-ttl
    choice: "Default TTL of 86400 seconds"
    rationale: "Credentials outlast any reasonable call duration while still expiring"

metrics:
  tasks-completed: 3
  tasks-total: 3
  duration: 4 minutes
  completed: 2026-01-28
---

# Phase 03 Plan 01: TURN/STUN Server Setup Summary

**One-liner:** Coturn TURN/STUN server in Docker with HMAC-SHA1 time-limited credential generation via authenticated REST API.

## What Was Built

### Coturn Docker Service

Added coturn/coturn:4.6.3 service to docker-compose.yml with:
- Ports: 3478 (UDP+TCP TURN), 5349 (UDP+TCP DTLS), 49152-49200/udp (media relay)
- Command-line configuration: `--use-auth-secret`, `--no-cli`, `--no-tls`, `--log-file=stdout`
- Healthcheck: `nc -z localhost 3478`
- Environment: `TURN_SECRET` and `TURN_REALM` from .env

### TURN Credentials Service

Created `turnService.ts` implementing RFC-style TURN REST API authentication:

```typescript
interface TurnCredentials {
  username: string;    // "{expiry_timestamp}:{userId}"
  password: string;    // HMAC-SHA1(secret, username) base64 encoded
  ttl: number;         // Time-to-live in seconds (default: 86400)
  uris: string[];      // TURN server URIs
}
```

### REST API Endpoint

Created `GET /api/turn/credentials` endpoint:
- Requires JWT authentication (same pattern as other protected routes)
- Returns TURN credentials for the authenticated user
- Credentials include user-specific username and HMAC password

### Environment Variables

Added to `.env.example`:
- `TURN_SECRET` - Shared secret for HMAC credential generation
- `TURN_REALM` - TURN server realm (domain in production, localhost for dev)
- `TURN_HOST` - TURN server host for URI generation

## Commits

| Hash | Type | Description |
|------|------|-------------|
| dae34a3 | feat | Add coturn TURN/STUN server to Docker Compose |
| 0a535c4 | feat | Create TURN credentials service |
| 2c84e40 | feat | Create TURN credentials REST endpoint |

## Verification Results

| Check | Result |
|-------|--------|
| docker compose config validates | PASS |
| coturn service defined with correct ports | PASS |
| Backend builds without TypeScript errors | PASS |
| turnService exports generateTurnCredentials | PASS |
| turn.ts imports from turnService | PASS |
| server.ts registers turnRoutes | PASS |
| Endpoint returns 401 without auth | PASS |
| Endpoint returns 200 with valid JWT | PASS |
| Credentials contain userId in username | PASS |
| Credentials contain HMAC password | PASS |
| Credentials contain 24h TTL | PASS |
| URIs use configurable TURN_HOST | PASS |

## Decisions Made

### 1. Limited Port Range (49152-49200)

**Decision:** Use 49 media relay ports instead of full 49152-65535 range.

**Rationale:** Docker performance significantly degrades with large port ranges. For development and moderate-scale deployments, 49 concurrent media streams is sufficient. Production deployments can increase this range if needed.

### 2. REST API Authentication (HMAC-SHA1)

**Decision:** Use time-limited HMAC-SHA1 credentials per RFC 5389.

**Rationale:** This is the standard authentication mechanism for TURN servers. Credentials are:
- Time-limited (expire after TTL)
- User-specific (tied to userId)
- Cryptographically verified (HMAC prevents tampering)

### 3. No TLS on Coturn

**Decision:** Configure coturn without TLS (`--no-tls`).

**Rationale:** TLS termination happens at nginx reverse proxy level. For development, plain TURN works. Production can add DTLS support if needed.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**For 03-02 (Signaling Service):**
- TURN credentials API available at `/api/turn/credentials`
- Coturn ready to accept connections once started
- Environment variables documented in `.env.example`

**Notes:**
- Coturn container not started yet (will need `docker compose up -d coturn`)
- Production deployment needs: real TURN_SECRET, public IP for TURN_HOST, matching TURN_REALM

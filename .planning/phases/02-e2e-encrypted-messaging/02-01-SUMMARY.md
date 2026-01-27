---
phase: 02-e2e-encrypted-messaging
plan: 01
subsystem: api
tags: [websocket, fastify, postgresql, jwt, real-time]

# Dependency graph
requires:
  - phase: 01-foundation-deployment
    provides: JWT authentication, users table, Fastify server
provides:
  - Messages table schema with E2E encryption support
  - WebSocket endpoint with JWT authentication
  - Active connection tracking for real-time delivery
affects: [02-02, 02-03, 02-04, 02-05, 02-06]

# Tech tracking
tech-stack:
  added: ["@fastify/websocket"]
  patterns: ["WebSocket JWT via query param", "Connection tracking Map"]

key-files:
  created:
    - backend/src/routes/websocket.ts
    - backend/src/middleware/wsAuth.ts
  modified:
    - postgres/init.sql
    - backend/src/server.ts
    - backend/package.json

key-decisions:
  - "JWT passed via query parameter for WebSocket (headers not easily accessible)"
  - "Active connections stored in Map<userId, WebSocket>"
  - "public_key column nullable (set after client key generation)"
  - "No server-side encryption - E2E encrypted by client"

patterns-established:
  - "WebSocket auth: token in query param, verified in preValidation hook"
  - "Connection tracking: Map export for cross-module access"

# Metrics
duration: 8min
completed: 2026-01-27
---

# Phase 02 Plan 01: WebSocket Infrastructure & Database Schema Summary

**Messages table with E2E fields, @fastify/websocket with JWT query param auth, activeConnections Map for delivery**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-27T[start]
- **Completed:** 2026-01-27T[end]
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Messages table with sender, recipient, encrypted_content, delivery timestamps
- public_key column on users for X25519 keys
- WebSocket endpoint at /api/ws with preValidation JWT auth
- Active connection tracking for real-time message delivery

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend database schema for messaging** - `798dbb2` (feat)
2. **Task 2: Install @fastify/websocket and create auth middleware** - `4f5d628` (feat)
3. **Task 3: Create WebSocket route with authentication** - `eafd374` (feat)

## Files Created/Modified
- `postgres/init.sql` - Added public_key column and messages table with indexes
- `backend/src/middleware/wsAuth.ts` - JWT verification from query parameter
- `backend/src/routes/websocket.ts` - WebSocket endpoint with connection tracking
- `backend/src/server.ts` - Registered websocket plugin and routes
- `backend/package.json` - Added @fastify/websocket dependency

## Decisions Made
- **JWT via query param:** WebSocket connections cannot easily use Authorization headers, so token passed as `?token=...`
- **Map for connections:** Simple Map<userId, WebSocket> allows O(1) lookup for message delivery
- **Nullable public_key:** Users generate keys client-side after registration, column starts null
- **No pgcrypto:** Server stores already-encrypted content; simplifies v1, can add at-rest encryption later

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript error on `request.user` type - resolved by using `@fastify/jwt` FastifyJWT interface augmentation
- Error parameter in WebSocket handler needed explicit `Error` type annotation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Database schema ready for messages storage
- WebSocket infrastructure ready for message routing
- Plan 02 (crypto utilities) can proceed with key generation
- Plan 03 (message API) can use activeConnections for delivery

---
*Phase: 02-e2e-encrypted-messaging*
*Completed: 2026-01-27*

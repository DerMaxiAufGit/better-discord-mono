# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Own your communication — your server, your data, your rules. Privacy through self-hosting and E2E encryption.
**Current focus:** Phase 2: E2E Encrypted Messaging

## Current Position

Phase: 2 of 4 (E2E Encrypted Messaging) - COMPLETE
Plan: 07 of 07 (Integration and Verification complete)
Status: **Phase 2 Complete**
Last activity: 2026-01-28 — Completed 02-07-PLAN.md with password-derived keys

Progress: [██████████] 100% (7/7 Phase 2 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 4.9 minutes
- Total execution time: 0.98 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-deployment | 5 | 21 min | 4.2 min |
| 02-e2e-encrypted-messaging | 7 | 38 min | 5.4 min |

**Recent Trend:**
- Last 5 plans: 02-03 (8 min), 02-04 (9 min), 02-05 (7 min), 02-06 (4 min)
- Trend: Consistent execution pace for messaging infrastructure plans

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Decision | Context | Impact |
|------|----------|---------|--------|
| 2026-01-27 | 50 user limit on contact search | Prevent large result sets in user discovery (from 02-06) | API performance bounded |
| 2026-01-27 | ILIKE pattern for email search | Case-insensitive partial matching (from 02-06) | User-friendly search experience |
| 2026-01-27 | 300ms debounce on search | Prevent excessive API calls during typing (from 02-06) | Reduced backend load |
| 2026-01-27 | Session keys cached per contactId | O(1) lookup for derived session keys (from 02-04) | Performance optimization for repeated messaging |
| 2026-01-27 | loadHistory accepts decrypt function | Decouples messageStore from crypto implementation (from 02-04) | Cleaner separation of concerns |
| 2026-01-27 | Optimistic messages use negative tempId | -Date.now() avoids collision with server IDs (from 02-04) | Smooth UI updates for sent messages |
| 2026-01-27 | WebSocket reconnects after 3s delay | Prevent rapid reconnection loops (from 02-04) | Stable reconnection behavior |
| 2026-01-27 | Simplified shadcn/ui components | Avatar and ScrollArea without Radix UI dependency (from 02-05) | Simpler setup while maintaining shadcn patterns |
| 2026-01-27 | Unicode checkmarks for message status | Avoid emojis for cross-platform consistency (from 02-05) | Consistent rendering across systems |
| 2026-01-27 | Fastify authenticate decorator | request.jwtVerify() for protected REST endpoints (from 02-03) | Simpler than manual header parsing |
| 2026-01-27 | Cursor-based message pagination | beforeId with limit cap at 100 (from 02-03) | Efficient infinite scroll without offset issues |
| 2026-01-27 | Read receipts via WebSocket | Sender notified when recipient marks read (from 02-03) | Real-time read status updates |
| 2026-01-27 | Three development setup options | Docker hybrid, full Docker, fully local (from 01-05) | Developers have different preferences for local development |
| 2026-01-27 | Single refresh promise for thundering herd | Concurrent 401s share one refresh request | Prevents API stampede when multiple requests fail simultaneously |
| 2026-01-27 | ProtectedRoute isInitialized check | Wait for auth check before redirecting | Avoids flashing login page when already authenticated |
| 2026-01-27 | Password strength meter with zxcvbn | Industry-standard strength estimation | Real-time feedback on password quality |
| 2026-01-27 | Access token in localStorage, refresh in httpOnly | Balance JS access with XSS protection | Access token 15m (needs JS), refresh 7d (protected) |
| 2026-01-27 | Sliding window refresh tokens | Active users stay logged in indefinitely | Refresh endpoint rotates both access and refresh tokens |
| 2026-01-27 | Generic "Invalid credentials" error | Prevents user enumeration attacks | Same response for wrong password and nonexistent user |
| 2026-01-27 | 12 bcrypt salt rounds | Balance security and performance | Standard for password hashing |
| 2026-01-27 | HttpOnly cookies with sameSite strict | XSS protection, CSRF protection | Refresh tokens never accessible to JavaScript |
| 2026-01-27 | Tailwind CSS v3 over v4 | v4 incompatible with shadcn/ui patterns | Stable foundation for UI components |
| 2026-01-27 | next-themes for theme management | System preference detection, localStorage persistence | Theme persists across sessions |
| 2026-01-27 | Sidebar-based navigation (240px/64px) | Discord/Slack pattern, collapsible | Main navigation pattern for all phases |
| 2026-01-27 | PostgreSQL 18-alpine for database | Latest stable, smaller image | Foundation for all data storage |
| 2026-01-27 | Fastify over Express for backend | 20-30% faster, TypeScript-native | API framework for all endpoints |
| 2026-01-27 | Nginx reverse proxy with /api pattern | Single port in production, simpler CORS | Frontend/backend communication pattern |
| 2026-01-27 | Health check orchestration | Reliable startup ordering | All services use depends_on: service_healthy |
| 2026-01-27 | JWT via WebSocket query param | Headers not easily accessible in WebSocket (from 02-01) | Token passed as ?token= |
| 2026-01-27 | Connection tracking via Map | O(1) lookup for message delivery (from 02-01) | activeConnections exported for cross-module access |
| 2026-01-27 | Nullable public_key column | Keys generated client-side after registration (from 02-01) | Column starts null until key upload |
| 2026-01-27 | XChaCha20-Poly1305 for symmetric encryption | 192-bit nonce safe for random generation (from 02-02) | No nonce tracking needed, simplifies implementation |
| 2026-01-27 | X25519 key exchange via crypto_kx | Bidirectional session keys from asymmetric pairs (from 02-02) | Signal-style key derivation pattern |
| 2026-01-27 | IndexedDB for client-side key storage | Persistent across sessions, better for binary data (from 02-02) | Keys survive page refresh |
| 2026-01-27 | Lexicographic user ID for initiator role | Deterministic role assignment for session keys (from 02-02) | Both parties derive same keys |
| - | P2P for 1:1 calls | Privacy, reduced server load (from PROJECT.md) | Future Phase 3 |
| - | E2E encryption for messages | Core value proposition (from PROJECT.md) | In progress Phase 2 |
| - | Docker Compose deployment | Accessible to self-hosters (from PROJECT.md) | Completed in 01-01 |

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 Complete:**
- All Phase 1 success criteria verified programmatically
- Complete documentation suite created
- End-to-end deployment tested and confirmed working
- Note: Backend npm dependencies have 2 high severity vulnerabilities (non-blocking, should run npm audit fix)

**Phase 2 Progress:**
- 02-01: WebSocket infrastructure and messages table schema complete
- 02-02: Frontend crypto library complete (libsodium, X25519, XChaCha20-Poly1305)
- 02-03: Server-side key and message endpoints complete (keyService, messageService, REST APIs)
- 02-04: Frontend state management and WebSocket hook complete (cryptoStore, messageStore, contactStore, useMessaging)
- 02-05: Messaging UI components complete (Avatar, ScrollArea, MessageList, MessageInput, ConversationList, ConversationView)
- 02-06: User discovery API and ContactsPage complete (users endpoint, search, contact navigation)
- Next: 02-07 (Integration and verification)

**General:** All phases marked as "TBD" for plan count — will be refined during plan-phase execution.

## Development Infrastructure

**Database (External PostgreSQL):**
- Host: 172.16.70.14
- User: dev
- Password: ABlAMqQs2jDKKu7ZVWzOJbDywyjLswzWib5GQLtvKfGhjd6fn7woand1RMyPUKlv
- Database: chatapp

**Mail Server (for future email features):**
- Host: mail.maxi-haaser.de
- User: test@maxi-haaser.de
- Password: gdn1wbw@umj*mhw8YNE

**Note:** User prefers Claude to run demos/verification instead of manual testing.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 02-06-PLAN.md (User Discovery & ContactsPage)
Resume file: None (ready for 02-07-PLAN.md)
